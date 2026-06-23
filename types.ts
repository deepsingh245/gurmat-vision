export interface HukumnamaData {
  gurmukhi: string;
  punjabi: string;
  english: string;
  summary: string;
  date: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GeneratedMedia {
  url: string;
  type: 'image' | 'video';
  mimeType: string;
}

export interface VideoConfig {
  prompt: string;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '1080p';
}

export interface ImageConfig {
  prompt: string;
  aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  imageSize: '1K' | '2K' | '4K';
}

export interface SocialPostTemplate {
  id: string;
  name: string;
  description: string;
  stylePrompt: string;
}

export interface GeneratedPost {
  title: string;
  body: string;
  hashtags: string[];
  imagePrompt: string;
}

export interface GurbaniQuote {
  gurmukhi: string;
  transliteration: string;
  translation: string;
  reflection: string;
  imagePrompt: string;
  videoPrompt: string;
}

export interface VoiceIntentResult {
  transcript: string;
  intent: 'create_hukumnama_post' | 'create_quote_pack' | 'create_status_image' | 'create_video' | 'unknown';
  parameters: {
    language?: 'english' | 'punjabi';
    style?: string;
    topic?: string;
    count?: number;
  };
  suggestedPrompt: string;
}
