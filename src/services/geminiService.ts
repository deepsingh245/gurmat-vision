import { GoogleGenAI } from "@google/genai";
import { MODEL_NAMES, DEFAULT_HUKUMNAMA_PROMPT, VOICE_SYS_INSTRUCTION } from '@/constants';
import { HukumnamaData, GeneratedPost, GurbaniQuote, VoiceIntentResult } from '@/types';
import { extractJson } from '@/utils';

// NOTE: API key is currently injected via Vite's define config (vite.config.ts).
// This is TEMPORARY — Phase 5 will move all AI calls to Firebase Cloud Functions
// so the key is never exposed in the browser bundle.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fetchHukumnamaWithGemini = async (): Promise<HukumnamaData> => {
  const ai = getAiClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAMES.TEXT,
      contents: DEFAULT_HUKUMNAMA_PROMPT,
      config: { tools: [{ googleSearch: {} }] },
    });

    const data = JSON.parse(extractJson(response.text || ''));
    return {
      gurmukhi: data.gurmukhi || "Gurmukhi not found",
      punjabi: data.punjabi || "Punjabi translation not found",
      english: data.english || "English translation not found",
      summary: data.summary || "Summary not available",
      date: data.date || new Date().toLocaleDateString(),
    };
  } catch (e) {
    console.error("Failed to fetch or parse Hukumnama", e);
    return {
      gurmukhi: "Unable to load Hukumnama.",
      punjabi: "",
      english: "An error occurred while processing the daily Hukumnama. Please try refreshing.",
      summary: "Error loading data.",
      date: new Date().toLocaleDateString(),
    };
  }
};

export const generateStatusImage = async (
  prompt: string,
  size: '1K' | '2K' | '4K' = '1K',
  aspectRatio: string = '9:16'
): Promise<string> => {
  const ai = getAiClient();
  const isHighRes = size === '2K' || size === '4K';
  const model = isHighRes ? MODEL_NAMES.IMAGE_PRO : MODEL_NAMES.IMAGE_FLASH;

  const imageConfig: { aspectRatio: string; imageSize?: string } = { aspectRatio };
  if (isHighRes) imageConfig.imageSize = size;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image data found in response");
};

export const generateBackgroundVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const ai = getAiClient();

  let operation = await ai.models.generateVideos({
    model: MODEL_NAMES.VIDEO,
    prompt,
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed to return URI");

  const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await videoRes.blob();
  return URL.createObjectURL(blob);
};

export const generateVideoFromImage = async (
  imageBlob: Blob,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const ai = getAiClient();

  const base64Data = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(imageBlob);
  });
  const rawBase64 = base64Data.split(',')[1];

  let operation = await ai.models.generateVideos({
    model: MODEL_NAMES.VIDEO,
    prompt: prompt || "Animate this scene naturally",
    image: { imageBytes: rawBase64, mimeType: imageBlob.type },
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio },
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Video generation failed");

  const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
  const blob = await videoRes.blob();
  return URL.createObjectURL(blob);
};

export const generateSocialPost = async (
  hukumnama: HukumnamaData,
  stylePrompt: string,
  language: string
): Promise<GeneratedPost> => {
  const ai = getAiClient();
  const prompt = `
    Based on today's Hukumnama Summary: "${hukumnama.summary}" and Text: "${hukumnama.english}",
    create a social media post.
    Style: ${stylePrompt}
    Language: ${language} (Write the body in this language, but keep Hashtags bilingual).

    Return JSON format:
    {
      "title": "A short engaging title",
      "body": "The main post content (1-2 paragraphs)",
      "hashtags": ["#tag1", "#tag2"],
      "imagePrompt": "A detailed prompt for an AI image generator to create a background for this post (no text in image)"
    }
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAMES.TEXT,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text || '{}');
};

export const generateQuotePack = async (topic: string, count = 5): Promise<GurbaniQuote[]> => {
  const ai = getAiClient();
  const prompt = `
    Generate ${count} distinct Gurbani quotes related to the topic: "${topic}".
    Return a JSON array where each object has:
    - "gurmukhi": Original Gurbani line.
    - "transliteration": English transliteration.
    - "translation": English translation.
    - "reflection": A 1-sentence spiritual reflection.
    - "imagePrompt": A prompt for an AI image generator for a background (abstract, spiritual, no text).
    - "videoPrompt": A prompt for an AI video generator (peaceful, cinematic).
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAMES.TEXT,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  return JSON.parse(response.text || '[]');
};

export const processVoiceIntent = async (audioBlob: Blob): Promise<VoiceIntentResult> => {
  const ai = getAiClient();

  const base64Audio = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  const response = await ai.models.generateContent({
    model: MODEL_NAMES.AUDIO_PROCESSOR,
    contents: {
      parts: [
        { inlineData: { mimeType: audioBlob.type, data: base64Audio } },
        { text: "Please process this audio command." },
      ],
    },
    config: {
      systemInstruction: VOICE_SYS_INSTRUCTION,
      responseMimeType: 'application/json',
    },
  });

  return JSON.parse(response.text || '{}');
};
