import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import { moderatePrompt } from './moderation';
export { hukumnamaGrantAdReward } from './ads';

admin.initializeApp();

const geminiKey = defineSecret('GEMINI_API_KEY');

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = {
  TEXT:        'gemini-2.5-flash',
  IMAGE_FLASH: 'gemini-2.5-flash-image',
  IMAGE_PRO:   'gemini-3-pro-image-preview',
  VIDEO:       'veo-3.1-fast-generate-preview',
};

const GURBANINOW_API = 'https://api.gurbaninow.com/v2/hukamnama/today';

interface GurbaniNowLine {
  gurmukhi: { unicode: string };
  translation: { english: Record<string, string>; punjabi: Record<string, string> };
}
interface GurbaniNowResponse {
  error: boolean;
  date: { gregorian: { month: string; date: number; year: number } };
  hukamnama: Array<{ line: GurbaniNowLine }>;
}

function firstValue(obj: Record<string, string>): string {
  return Object.values(obj).find(v => typeof v === 'string' && v.trim()) ?? '';
}

const VOICE_SYS_INSTRUCTION = `
You are an intelligent assistant for a Sikh Gurbani App.
Your job is to listen to the user's voice command and extract their intent.
The valid intents are:
- 'create_hukumnama_post': User wants to write a text post about today's hukumnama.
- 'create_quote_pack': User wants a list of Gurbani quotes.
- 'create_status_image': User wants to generate an image.
- 'create_video': User wants to generate a video.

Return a JSON object with:
- transcript: The exact text spoken.
- intent: One of the valid intents.
- parameters: Object containing extracted preferences like 'language', 'style', 'topic', or 'count'.
- suggestedPrompt: A highly optimized prompt string to execute the request.
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────


function getAi(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: geminiKey.value() });
}


async function uploadToStorage(
  buffer: Buffer,
  filePath: string,
  contentType: string,
): Promise<string> {
  const bucket = admin.storage().bucket();
  const file = bucket.file(filePath);
  const token = randomUUID();
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const encodedPath = encodeURIComponent(filePath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;
}

// ─── moderateContent — standalone callable for client pre-checks ──────────────

interface ModerateRequest { prompt: string }

export const hukumnamaModerateContent = onCall(
  { secrets: [geminiKey] },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { prompt } = request.data as ModerateRequest;
    if (!prompt?.trim()) return { safe: true, reason: '' };
    // Throws permission-denied if rejected (client catches it)
    await moderatePrompt(prompt, uid, getAi());
    return { safe: true, reason: '' };
  }
);

// ─── getHukumnama — fixed system prompt, no user input, no moderation needed ──

export const hukumnamaGetHukumnama = onCall(
  { secrets: [geminiKey] },
  async (_request) => {
    const res = await fetch(GURBANINOW_API);
    if (!res.ok) throw new HttpsError('unavailable', 'Failed to fetch Hukamnama from source');

    const data = await res.json() as GurbaniNowResponse;
    if (data.error) throw new HttpsError('unavailable', 'Hukamnama source returned an error');

    const gurmukhi = data.hukamnama.map(h => h.line.gurmukhi.unicode).filter(Boolean).join(' ');
    const punjabi  = data.hukamnama.map(h => firstValue(h.line.translation.punjabi)).filter(Boolean).join(' ');
    const english  = data.hukamnama.map(h => firstValue(h.line.translation.english)).filter(Boolean).join(' ');
    const { month, date: day, year } = data.date.gregorian;

    // Gemini used only for the 2-sentence summary — not for the canonical text
    let summary = '';
    try {
      const client = getAi();
      const summaryRes = await client.models.generateContent({
        model: MODEL.TEXT,
        contents: `Summarize the spiritual message of this Hukamnama in exactly 2 sentences. Keep it accessible and uplifting. Text: "${english}"`,
      });
      summary = summaryRes.text?.trim() ?? '';
    } catch {
      // Summary is non-critical — return the official text even if Gemini is unavailable
    }

    return { gurmukhi, punjabi, english, summary, date: `${month} ${day}, ${year}` };
  }
);

// ─── generateImage ────────────────────────────────────────────────────────────

interface GenerateImageRequest {
  prompt: string;
  size?: '1K' | '2K' | '4K';
  aspectRatio?: string;
}

export const hukumnamaGenerateImage = onCall(
  { secrets: [geminiKey] },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { prompt, size = '1K', aspectRatio = '9:16' } = request.data as GenerateImageRequest;

    await moderatePrompt(prompt, uid, getAi());

    const client = getAi();
    const isHighRes = size === '2K' || size === '4K';
    const model = isHighRes ? MODEL.IMAGE_PRO : MODEL.IMAGE_FLASH;
    const imageConfig: { aspectRatio: string; imageSize?: string } = { aspectRatio };
    if (isHighRes) imageConfig.imageSize = size;

    const response = await client.models.generateContent({
      model,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, 'base64');
        const mimeType = part.inlineData.mimeType ?? 'image/png';
        const ext = mimeType.split('/')[1] ?? 'png';
        const filePath = `generated-images/${uid}/${Date.now()}.${ext}`;
        const url = await uploadToStorage(buffer, filePath, mimeType);
        return { url };
      }
    }
    throw new HttpsError('internal', 'No image data returned by Imagen');
  }
);

// ─── generateVideo ────────────────────────────────────────────────────────────

interface GenerateVideoRequest {
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
}

export const hukumnamaGenerateVideo = onCall(
  { secrets: [geminiKey], timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { prompt, aspectRatio = '9:16' } = request.data as GenerateVideoRequest;

    await moderatePrompt(prompt, uid, getAi());

    const client = getAi();
    let operation = await client.models.generateVideos({
      model: MODEL.VIDEO,
      prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
    });

    while (!operation.done) {
      await new Promise(r => setTimeout(r, 5000));
      operation = await client.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new HttpsError('internal', 'Video generation produced no URI');

    const res = await fetch(`${videoUri}&key=${geminiKey.value()}`);
    if (!res.ok) throw new HttpsError('internal', `Video download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = `generated-videos/${uid}/${Date.now()}.mp4`;
    const url = await uploadToStorage(buffer, filePath, 'video/mp4');
    return { url };
  }
);

// ─── generateVideoFromImage ───────────────────────────────────────────────────

interface GenerateVideoFromImageRequest {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
  aspectRatio?: '16:9' | '9:16';
}

export const hukumnamaGenerateVideoFromImage = onCall(
  { secrets: [geminiKey], timeoutSeconds: 300, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const {
      imageBase64,
      imageMimeType,
      prompt,
      aspectRatio = '9:16',
    } = request.data as GenerateVideoFromImageRequest;

    await moderatePrompt(prompt, uid, getAi());

    const client = getAi();
    let operation = await client.models.generateVideos({
      model: MODEL.VIDEO,
      prompt: prompt || 'Animate this scene naturally',
      image: { imageBytes: imageBase64, mimeType: imageMimeType },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
    });

    while (!operation.done) {
      await new Promise(r => setTimeout(r, 5000));
      operation = await client.operations.getVideosOperation({ operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new HttpsError('internal', 'Video generation produced no URI');

    const res = await fetch(`${videoUri}&key=${geminiKey.value()}`);
    if (!res.ok) throw new HttpsError('internal', `Video download failed: ${res.status}`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const filePath = `generated-videos/${uid}/${Date.now()}.mp4`;
    const url = await uploadToStorage(buffer, filePath, 'video/mp4');
    return { url };
  }
);

// ─── generatePost ─────────────────────────────────────────────────────────────

interface GeneratePostRequest {
  hukumnama: { summary: string; english: string };
  stylePrompt: string;
  language: string;
}

export const hukumnamaGeneratePost = onCall(
  { secrets: [geminiKey] },
  async (request) => {
    const { hukumnama, stylePrompt, language } = request.data as GeneratePostRequest;
    const client = getAi();

    const prompt = `
Based on today's Hukumnama Summary: "${hukumnama.summary}" and Text: "${hukumnama.english}",
create a social media post.
Style: ${stylePrompt}
Language: ${language} (Write the body in this language, but keep Hashtags bilingual).

Return JSON:
{
  "title": "A short engaging title",
  "body": "The main post content (1-2 paragraphs)",
  "hashtags": ["#tag1", "#tag2"],
  "imagePrompt": "A detailed prompt for an AI image generator (no text in image)"
}
`;

    const response = await client.models.generateContent({
      model: MODEL.TEXT,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text ?? '{}');
  }
);

// ─── generateQuotePack ────────────────────────────────────────────────────────

interface GenerateQuotePackRequest {
  topic: string;
  count?: number;
}

export const hukumnamaGenerateQuotePack = onCall(
  { secrets: [geminiKey] },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { topic, count = 5 } = request.data as GenerateQuotePackRequest;

    await moderatePrompt(topic, uid, getAi());

    const client = getAi();
    const prompt = `
Generate ${count} distinct Gurbani quotes related to the topic: "${topic}".
Return a JSON array where each object has:
- "gurmukhi": Original Gurbani line.
- "transliteration": English transliteration.
- "translation": English translation.
- "reflection": A 1-sentence spiritual reflection.
- "imagePrompt": A prompt for an AI image generator background (abstract, spiritual, no text).
- "videoPrompt": A prompt for an AI video generator (peaceful, cinematic).
`;

    const response = await client.models.generateContent({
      model: MODEL.TEXT,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    return JSON.parse(response.text ?? '[]');
  }
);

// ─── processVoice — intent parsing only, no content generation ───────────────

interface ProcessVoiceRequest {
  audioBase64: string;
  mimeType: string;
}

export const hukumnamaProcessVoice = onCall(
  { secrets: [geminiKey] },
  async (request) => {
    const { audioBase64, mimeType } = request.data as ProcessVoiceRequest;
    const client = getAi();

    const response = await client.models.generateContent({
      model: MODEL.TEXT,
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: 'Please process this audio command.' },
        ],
      },
      config: {
        systemInstruction: VOICE_SYS_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });
    return JSON.parse(response.text ?? '{}');
  }
);
