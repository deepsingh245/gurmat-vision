export const CREDIT_COSTS = {
  IMAGE:      1,
  QUOTE_CARD: 1,
  QUOTE_PACK: 1,
  VIDEO:      10,
} as const;

export const MODEL_NAMES = {
  TEXT: 'gemini-2.5-flash',
  IMAGE_FLASH: 'gemini-2.5-flash-image',
  IMAGE_PRO: 'gemini-3-pro-image-preview',
  VIDEO: 'veo-3.1-fast-generate-preview',
  AUDIO_PROCESSOR: 'gemini-2.5-flash',
};

export const DEFAULT_HUKUMNAMA_PROMPT = `
Find the daily Hukumnama Sahib from Sri Darbar Sahib (Golden Temple) for today.
Return ONLY a valid JSON object. Do not include markdown code blocks or any other text.
The JSON must have the following keys:
- "gurmukhi": The full Hukumnama in Gurmukhi script.
- "punjabi": The Punjabi translation/Vyakhya.
- "english": The English translation.
- "summary": A short 2-sentence summary of the message.
- "date": The date of the Hukumnama.
`;

export const DEFAULT_IMAGE_PROMPT_TEMPLATE = (summary: string) => `
A spiritual and peaceful digital art background suitable for a religious quote.
Theme: ${summary}.
Style: Soft golden lighting, ethereal atmosphere, high resolution, detailed, cinematic lighting, divine.
No text in the image.
`;

export const DEFAULT_VIDEO_PROMPT_TEMPLATE = (summary: string) => `
Cinematic, photorealistic slow motion video of a peaceful spiritual scene.
Theme: ${summary}.
Elements: Soft golden light, gentle water ripples or floating particles, divine atmosphere.
High quality, 4k.
`;

export const SOCIAL_TEMPLATES = [
  { id: 'inspirational', name: 'Inspirational Wisdom', description: 'Uplifting and motivating tone', stylePrompt: 'Write an uplifting, motivational post focusing on the core wisdom.' },
  { id: 'explanation', name: 'Daily Explanation', description: 'Educational and clear', stylePrompt: 'Write a clear, educational explanation of the Hukumnama suitable for learners.' },
  { id: 'poetic', name: 'Poetic Reflection', description: 'Lyrical and deep', stylePrompt: 'Write a short poetic reflection in a reverent tone.' },
  { id: 'minimal', name: 'Modern Minimal', description: 'Short and punchy', stylePrompt: 'Keep it very short, minimal, and impactful. Max 2 sentences.' },
  { id: 'detailed', name: 'Detailed Interpretation', description: 'In-depth Gurmat analysis', stylePrompt: 'Provide a detailed Gurmat interpretation with historical context if applicable.' },
];

export const VOICE_SYS_INSTRUCTION = `
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
- parameters: Object containing extracted preferences like 'language' (english/punjabi), 'style' (minimal, detailed, etc), 'topic', or 'count'.
- suggestedPrompt: A highly optimized prompt string that can be used to execute the user's request immediately by an AI model.

Example:
User: "Make me 5 quotes about peace in Punjabi."
Response JSON:
{
  "transcript": "Make me 5 quotes about peace in Punjabi.",
  "intent": "create_quote_pack",
  "parameters": { "language": "punjabi", "topic": "peace", "count": 5 },
  "suggestedPrompt": "Generate 5 Gurbani quotes about 'peace'. Provide Gurmukhi, Punjabi translation, and a short reflection for each."
}
`;
