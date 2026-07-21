import { httpsCallable, type FunctionsError } from 'firebase/functions';
import { functions } from '@/firebase/config';
import type { HukumnamaData, GeneratedPost, GurbaniQuote, VoiceIntentResult } from '@/types';

// All AI calls go through Firebase Cloud Functions — API key never leaves the server.
// Generated media is uploaded to Firebase Storage server-side; clients receive persistent URLs.

function call<Req, Res>(name: string, timeoutMs?: number) {
  return httpsCallable<Req, Res>(functions, name, timeoutMs ? { timeout: timeoutMs } : undefined);
}

// ─── Content moderation pre-check ────────────────────────────────────────────
// Call this BEFORE deducting credits so rejected prompts never cost the user.
// Throws a ContentRejectedError if the prompt violates the content policy.

export class ContentRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentRejectedError';
  }
}

export const checkContentPolicy = async (prompt: string): Promise<void> => {
  try {
    const fn = call<{ prompt: string }, { safe: boolean; reason: string }>('hukumnamaModerateContent');
    await fn({ prompt });
  } catch (e) {
    const fe = e as FunctionsError;
    if (fe.code === 'functions/permission-denied') {
      // Strip the "Content rejected: " prefix for a clean UI message
      const raw = fe.message ?? 'This content cannot be generated.';
      const clean = raw.replace(/^Content rejected:\s*/i, '');
      throw new ContentRejectedError(clean);
    }
    // Any other error (network, etc.) — let generation proceed; server-side
    // moderation inside the generation function is the hard gate.
  }
};

// ─── Hukumnama ────────────────────────────────────────────────────────────────

export const fetchHukumnamaWithGemini = async (): Promise<HukumnamaData> => {
  try {
    const fn = call<void, HukumnamaData>('hukumnamaGetHukumnama');
    const result = await fn();
    const d = result.data;
    return {
      gurmukhi: d.gurmukhi || 'Gurmukhi not found',
      punjabi:  d.punjabi  || 'Punjabi translation not found',
      english:  d.english  || 'English translation not found',
      summary:  d.summary  || 'Summary not available',
      date:     d.date     || new Date().toLocaleDateString(),
    };
  } catch (e) {
    console.error('Failed to fetch Hukumnama', e);
    return {
      gurmukhi: 'Unable to load Hukumnama.',
      punjabi:  '',
      english:  'An error occurred. Please try refreshing.',
      summary:  'Error loading data.',
      date:     new Date().toLocaleDateString(),
    };
  }
};

// ─── Image ────────────────────────────────────────────────────────────────────

export const generateStatusImage = async (
  prompt: string,
  size: '1K' | '2K' | '4K' = '1K',
  aspectRatio: string = '9:16'
): Promise<string> => {
  const fn = call<object, { url: string }>('hukumnamaGenerateImage');
  const result = await fn({ prompt, size, aspectRatio });
  return result.data.url;
};

// ─── Video ────────────────────────────────────────────────────────────────────

export const generateBackgroundVideo = async (
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const fn = call<object, { url: string }>('hukumnamaGenerateVideo', 300_000);
  const result = await fn({ prompt, aspectRatio });
  return result.data.url;
};

export const generateVideoFromImage = async (
  imageBlob: Blob,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '9:16'
): Promise<string> => {
  const imageBase64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageBlob);
  });

  const fn = call<object, { url: string }>('hukumnamaGenerateVideoFromImage', 300_000);
  const result = await fn({ imageBase64, imageMimeType: imageBlob.type, prompt, aspectRatio });
  return result.data.url;
};

// ─── Social post ──────────────────────────────────────────────────────────────

export const generateSocialPost = async (
  hukumnama: HukumnamaData,
  stylePrompt: string,
  language: string
): Promise<GeneratedPost> => {
  const fn = call<object, GeneratedPost>('hukumnamaGeneratePost');
  const result = await fn({ hukumnama, stylePrompt, language });
  return result.data;
};

// ─── Quote pack ───────────────────────────────────────────────────────────────

export const generateQuotePack = async (topic: string, count = 5): Promise<GurbaniQuote[]> => {
  const fn = call<object, GurbaniQuote[]>('hukumnamaGenerateQuotePack');
  const result = await fn({ topic, count });
  return result.data;
};

// ─── Voice ────────────────────────────────────────────────────────────────────

export const processVoiceIntent = async (audioBlob: Blob): Promise<VoiceIntentResult> => {
  const audioBase64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(audioBlob);
  });

  const fn = call<object, VoiceIntentResult>('hukumnamaProcessVoice');
  const result = await fn({ audioBase64, mimeType: audioBlob.type });
  return result.data;
};
