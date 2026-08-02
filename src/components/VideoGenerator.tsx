import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { generateBackgroundVideo, generateVideoFromImage, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import { HukumnamaData } from '@/types';
import { DEFAULT_VIDEO_PROMPT_TEMPLATE, CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { saveGeneration } from '@/firebase/firestore';
import { track } from '@/firebase/analytics';
import Button from './Button';

interface VideoGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const VideoGenerator: React.FC<VideoGeneratorProps> = ({ hukumnama }) => {
  const { t } = useTranslation();
  const { credits, canAfford, spend, refund } = useCredits();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [loading, setLoading]             = useState(false);
  const [videoUrl, setVideoUrl]           = useState<string | null>(null);
  const [customPrompt, setCustomPrompt]   = useState('');
  const [mode, setMode]                   = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(CREDIT_COSTS.VIDEO)) {
      setError(t('errors.notEnoughCredits', { need: CREDIT_COSTS.VIDEO, have: credits }));
      return;
    }
    track('generation_start', { type: 'video', credits_before: credits });
    setLoading(true);
    setVideoUrl(null);
    setError(null);
    let spent = false;
    try {
      const effectivePrompt = mode === 'text-to-video'
        ? (customPrompt || DEFAULT_VIDEO_PROMPT_TEMPLATE(hukumnama?.summary || 'Spiritual ambiance'))
        : (customPrompt || 'Animate this peacefully');
      await checkContentPolicy(effectivePrompt);
      await spend(CREDIT_COSTS.VIDEO);
      spent = true;
      let url = '';
      if (mode === 'text-to-video') {
        url = await generateBackgroundVideo(effectivePrompt, '9:16');
        if (user) saveGeneration(user.uid, 'video', effectivePrompt, url, CREDIT_COSTS.VIDEO).catch(() => {});
        else addGuestGeneration({ type: 'video', prompt: effectivePrompt, resultUrl: url, creditsUsed: CREDIT_COSTS.VIDEO });
      } else if (mode === 'image-to-video' && uploadedImage) {
        url = await generateVideoFromImage(uploadedImage, effectivePrompt, '9:16');
        if (user) saveGeneration(user.uid, 'video', effectivePrompt, url, CREDIT_COSTS.VIDEO).catch(() => {});
        else addGuestGeneration({ type: 'video', prompt: effectivePrompt, resultUrl: url, creditsUsed: CREDIT_COSTS.VIDEO });
      }
      setVideoUrl(url);
      track('generation_done', { type: 'video', success: 1, credits_used: CREDIT_COSTS.VIDEO });
      window.dispatchEvent(new Event('generation-complete'));
    } catch (e) {
      track('generation_done', { type: 'video', success: 0, credits_used: 0 });
      if (spent) await refund(CREDIT_COSTS.VIDEO);
      setError(e instanceof ContentRejectedError ? e.message : t('errors.generateVideo'));
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadedImage(e.target.files[0]);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🎥</span> {t('video.heading')}
            </h3>
            <span className="text-xs text-gray-400">⭐ {credits} credits</span>
          </div>

          <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-1 text-xs font-bold rounded-md ${mode === 'text-to-video' ? 'bg-white shadow text-navy-900' : 'text-gray-500'}`}
              onClick={() => setMode('text-to-video')}
            >
              {t('video.textToVideo')}
            </button>
            <button
              className={`flex-1 py-1 text-xs font-bold rounded-md ${mode === 'image-to-video' ? 'bg-white shadow text-navy-900' : 'text-gray-500'}`}
              onClick={() => setMode('image-to-video')}
            >
              {t('video.imageToVideo')}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {mode === 'image-to-video' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full text-sm">
                  {uploadedImage ? uploadedImage.name : t('video.uploadImage')}
                </Button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('video.animationPrompt')}</label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                rows={4}
                placeholder={mode === 'image-to-video' ? t('video.animatePlaceholder') : t('video.scenePlaceholder')}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              isLoading={loading}
              disabled={mode === 'image-to-video' && !uploadedImage}
              className="w-full"
            >
              {!user
                ? t('generate.signInRequired')
                : loading
                  ? t('video.generating')
                  : t('video.generate', { cost: CREDIT_COSTS.VIDEO })}
            </Button>

            <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 border border-yellow-200">
              <strong>Note:</strong> {t('video.note')}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-125 relative overflow-hidden shadow-inner border border-gray-200">
        {videoUrl ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            <div className="relative aspect-9/16 h-full max-h-150 shadow-2xl rounded-lg overflow-hidden bg-black">
              <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
              {hukumnama && (
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent pointer-events-none">
                  <p className="text-white font-gurmukhi text-center text-sm drop-shadow-lg mb-2 line-clamp-4">
                    {hukumnama.gurmukhi}
                  </p>
                  <p className="text-saffron-300 text-center text-xs">{t('hukumnama.langGurmukhi')}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">🎬</p>
            <p>{t('video.emptyMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator;
