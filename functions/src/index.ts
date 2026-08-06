import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';
import { randomUUID } from 'crypto';
import { moderatePrompt } from './moderation';
import {
  validatePrompt,
  validateImagePayload,
  rateLimit,
  checkDailyCap,
  spendCredits,
  refundCredits,
  logSpend,
  CREDIT_COSTS,
} from './guards';
export { hukumnamaGrantAdReward } from './ads';
export {
  hukumnamaAdminGetUsers,
  hukumnamaAdminGetGenerations,
  hukumnamaAdminGetRefusals,
  hukumnamaAdminAdjustCredits,
  hukumnamaAdminGetAdStats,
} from './admin';

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

function todayKeyIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function yesterdayKeyIST(): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA');
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

interface HukumnamaDoc {
  gurmukhi: string;
  punjabi: string;
  english: string;
  summary: string;
  date: string;
}

async function fetchAndCacheHukamnama(dateKey: string): Promise<HukumnamaDoc> {
  const res = await withRetry(() => fetch(GURBANINOW_API));
  if (!res.ok) throw new HttpsError('unavailable', 'Failed to fetch Hukamnama from source');

  const data = await res.json() as GurbaniNowResponse;
  if (data.error) throw new HttpsError('unavailable', 'Hukamnama source returned an error');

  const gurmukhi   = data.hukamnama.map(h => h.line.gurmukhi.unicode).filter(Boolean).join(' ');
  let   punjabi    = data.hukamnama.map(h => firstValue(h.line.translation.punjabi)).filter(Boolean).join(' ');
  const english    = data.hukamnama.map(h => firstValue(h.line.translation.english)).filter(Boolean).join(' ');
  const { month, date: day, year } = data.date.gregorian;

  let summary = '';
  try {
    const client = getAi();
    const aiRes = await client.models.generateContent({
      model: MODEL.TEXT,
      contents: [
        'You are a Gurbani scholar. Given the English translation of today\'s Hukamnama, return a JSON object with exactly two keys:',
        '  "summary": a 2-sentence accessible and uplifting spiritual summary in English.',
        '  "punjabi": a faithful Punjabi translation in Gurmukhi script (ਗੁਰਮੁਖੀ). Keep it reverent and close to the original meaning.',
        `English text: "${english}"`,
        'Respond with only the JSON object, no markdown fences.',
      ].join('\n'),
    });
    const raw = aiRes.text?.trim() ?? '';
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, '').trim()) as { summary?: string; punjabi?: string };
    if (parsed.summary) summary = parsed.summary;
    if (parsed.punjabi && !punjabi) punjabi = parsed.punjabi;
  } catch { /* non-critical — Hukamnama text still returned without AI enrichment */ }

  const doc: HukumnamaDoc = { gurmukhi, punjabi, english, summary, date: `${month} ${day}, ${year}` };
  try {
    await admin.firestore().collection('hukamnama').doc(dateKey).set(doc);
  } catch { /* non-critical */ }
  return doc;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  { secrets: [geminiKey], cors: true },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { prompt } = request.data as ModerateRequest;
    if (!prompt?.trim()) return { safe: true, reason: '' };
    await rateLimit(uid, 'moderateContent');
    await moderatePrompt(prompt, uid, getAi());
    return { safe: true, reason: '' };
  }
);

// ─── getHukumnama — reads from Firestore cache, falls back to live fetch ──────

export const hukumnamaGetHukumnama = onCall(
  { secrets: [geminiKey], cors: true },
  async (_request) => {
    const db = admin.firestore();
    const dateKey = todayKeyIST();
    const cached = await db.collection('hukamnama').doc(dateKey).get();
    if (cached.exists) return cached.data() as HukumnamaDoc;

    // Live fetch with internal retries (withRetry wraps the external API call)
    try {
      return await fetchAndCacheHukamnama(dateKey);
    } catch {
      // All retries exhausted — serve yesterday's doc rather than a hard error
      const prev = await db.collection('hukamnama').doc(yesterdayKeyIST()).get();
      if (prev.exists) return prev.data() as HukumnamaDoc;
      throw new HttpsError('unavailable', 'Hukamnama is temporarily unavailable. Please try again later.');
    }
  }
);

// ─── scheduledFetch — runs 6:05 AM IST daily, populates Firestore cache ───────

export const hukumnamaScheduledFetch = onSchedule(
  { schedule: '5 6 * * *', timeZone: 'Asia/Kolkata', secrets: [geminiKey] },
  async () => {
    await fetchAndCacheHukamnama(todayKeyIST());
  }
);

// ─── generateImage ────────────────────────────────────────────────────────────

interface GenerateImageRequest {
  prompt: string;
  size?: '1K' | '2K' | '4K';
  aspectRatio?: string;
}

export const hukumnamaGenerateImage = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { prompt, size = '1K', aspectRatio = '9:16' } = request.data as GenerateImageRequest;

    validatePrompt(prompt);
    await rateLimit(uid, 'generateImage');
    if (uid !== 'guest') await checkDailyCap(uid, 'generateImage');
    await moderatePrompt(prompt, uid, getAi());
    if (uid !== 'guest') await spendCredits(uid, CREDIT_COSTS.IMAGE);

    const spent = uid !== 'guest';
    try {
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
          await logSpend(uid, 'generateImage', CREDIT_COSTS.IMAGE);
          return { url };
        }
      }
      throw new HttpsError('internal', 'No image data returned by Imagen');
    } catch (e) {
      if (spent) await refundCredits(uid, CREDIT_COSTS.IMAGE);
      throw e;
    }
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
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to generate videos.');
    const uid = request.auth.uid;
    const { prompt, aspectRatio = '9:16' } = request.data as GenerateVideoRequest;

    validatePrompt(prompt);
    await rateLimit(uid, 'generateVideo');
    await checkDailyCap(uid, 'generateVideo');
    await moderatePrompt(prompt, uid, getAi());
    await spendCredits(uid, CREDIT_COSTS.VIDEO);

    let spent = true;
    try {
      const client = getAi();
      let operation = await client.models.generateVideos({
        model: MODEL.VIDEO,
        prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
      });

      const MAX_POLLS = 60;
      let polls = 0;
      while (!operation.done && polls < MAX_POLLS) {
        await new Promise(r => setTimeout(r, 5000));
        operation = await client.operations.getVideosOperation({ operation });
        polls++;
      }

      if (!operation.done) throw new HttpsError('deadline-exceeded', 'Video generation timed out. Please try again.');
      if (operation.error) throw new HttpsError('internal', `Video generation failed: ${operation.error.message ?? 'unknown error'}`);

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) throw new HttpsError('internal', 'Video generation produced no output. The prompt may have been filtered or the model quota exceeded.');

      const res = await fetch(`${videoUri}&key=${geminiKey.value()}`);
      if (!res.ok) throw new HttpsError('internal', `Video download failed: ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = `generated-videos/${uid}/${Date.now()}.mp4`;
      const url = await uploadToStorage(buffer, filePath, 'video/mp4');
      spent = false;
      await logSpend(uid, 'generateVideo', CREDIT_COSTS.VIDEO);
      return { url };
    } catch (e) {
      if (spent) await refundCredits(uid, CREDIT_COSTS.VIDEO);
      throw e;
    }
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
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to generate videos.');
    const uid = request.auth.uid;
    const {
      imageBase64,
      imageMimeType,
      prompt,
      aspectRatio = '9:16',
    } = request.data as GenerateVideoFromImageRequest;

    validateImagePayload(imageBase64);
    validatePrompt(prompt);
    await rateLimit(uid, 'generateVideoFromImage');
    await checkDailyCap(uid, 'generateVideoFromImage');
    await moderatePrompt(prompt, uid, getAi());
    await spendCredits(uid, CREDIT_COSTS.VIDEO);

    let spent = true;
    try {
      const client = getAi();
      let operation = await client.models.generateVideos({
        model: MODEL.VIDEO,
        prompt: prompt || 'Animate this scene naturally',
        image: { imageBytes: imageBase64, mimeType: imageMimeType },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
      });

      const MAX_POLLS = 60;
      let polls = 0;
      while (!operation.done && polls < MAX_POLLS) {
        await new Promise(r => setTimeout(r, 5000));
        operation = await client.operations.getVideosOperation({ operation });
        polls++;
      }

      if (!operation.done) throw new HttpsError('deadline-exceeded', 'Video generation timed out. Please try again.');
      if (operation.error) throw new HttpsError('internal', `Video generation failed: ${operation.error.message ?? 'unknown error'}`);

      const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!videoUri) throw new HttpsError('internal', 'Video generation produced no output. The prompt may have been filtered or the model quota exceeded.');

      const res = await fetch(`${videoUri}&key=${geminiKey.value()}`);
      if (!res.ok) throw new HttpsError('internal', `Video download failed: ${res.status}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const filePath = `generated-videos/${uid}/${Date.now()}.mp4`;
      const url = await uploadToStorage(buffer, filePath, 'video/mp4');
      spent = false;
      await logSpend(uid, 'generateVideoFromImage', CREDIT_COSTS.VIDEO);
      return { url };
    } catch (e) {
      if (spent) await refundCredits(uid, CREDIT_COSTS.VIDEO);
      throw e;
    }
  }
);

// ─── generatePost ─────────────────────────────────────────────────────────────

interface GeneratePostRequest {
  hukumnama: { summary: string; english: string };
  stylePrompt: string;
  language: string;
}

export const hukumnamaGeneratePost = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { hukumnama, stylePrompt, language } = request.data as GeneratePostRequest;

    validatePrompt(stylePrompt, 500);
    await rateLimit(uid, 'generatePost');
    if (uid !== 'guest') await checkDailyCap(uid, 'generatePost');
    await moderatePrompt(stylePrompt, uid, getAi());
    if (uid !== 'guest') await spendCredits(uid, CREDIT_COSTS.IMAGE);

    const spent = uid !== 'guest';
    try {
      const client = getAi();
      const prompt = `
Based on today's Hukamnama Summary: "${hukumnama.summary}" and Text: "${hukumnama.english}",
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
      await logSpend(uid, 'generatePost', CREDIT_COSTS.IMAGE);
      return JSON.parse(response.text ?? '{}');
    } catch (e) {
      if (spent) await refundCredits(uid, CREDIT_COSTS.IMAGE);
      throw e;
    }
  }
);

// ─── generateQuotePack ────────────────────────────────────────────────────────

interface GenerateQuotePackRequest {
  topic: string;
  count?: number;
}

export const hukumnamaGenerateQuotePack = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { topic, count = 5 } = request.data as GenerateQuotePackRequest;

    validatePrompt(topic);
    await rateLimit(uid, 'generateQuotePack');
    if (uid !== 'guest') await checkDailyCap(uid, 'generateQuotePack');
    await moderatePrompt(topic, uid, getAi());
    if (uid !== 'guest') await spendCredits(uid, CREDIT_COSTS.QUOTE_PACK);

    const spent = uid !== 'guest';
    try {
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
      await logSpend(uid, 'generateQuotePack', CREDIT_COSTS.QUOTE_PACK);
      return JSON.parse(response.text ?? '[]');
    } catch (e) {
      if (spent) await refundCredits(uid, CREDIT_COSTS.QUOTE_PACK);
      throw e;
    }
  }
);

// ─── processVoice — intent parsing only, no content generation ────────────────

interface ProcessVoiceRequest {
  audioBase64: string;
  mimeType: string;
}

export const hukumnamaProcessVoice = onCall(
  { secrets: [geminiKey], cors: true },
  async (request) => {
    const uid = request.auth?.uid ?? 'guest';
    const { audioBase64, mimeType } = request.data as ProcessVoiceRequest;

    validateImagePayload(audioBase64);
    await rateLimit(uid, 'processVoice');

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
