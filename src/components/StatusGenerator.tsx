import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateStatusImage, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import { HukumnamaData } from '@/types';
import { DEFAULT_IMAGE_PROMPT_TEMPLATE, CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { saveGeneration } from '@/firebase/firestore';
import { track } from '@/firebase/analytics';
import Button from './Button';

interface StatusGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const StatusGenerator: React.FC<StatusGeneratorProps> = ({ hukumnama }: { hukumnama: HukumnamaData | null }) => {
  const { t } = useTranslation();
  const { credits, canAfford, spend, refund } = useCredits();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [loading, setLoading]                 = useState(false);
  const [imageUrl, setImageUrl]               = useState<string | null>(null);
  const [customPrompt, setCustomPrompt]       = useState('');
  const [size, setSize]                       = useState<'1K' | '2K' | '4K'>('1K');
  const [showTextOverlay, setShowTextOverlay] = useState(true);
  const [error, setError]                     = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!hukumnama && !customPrompt) return;
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(CREDIT_COSTS.IMAGE)) {
      setError(t('errors.notEnoughCredits', { need: CREDIT_COSTS.IMAGE, have: credits }));
      return;
    }
    track('generation_start', { type: 'image', credits_before: credits });
    setLoading(true);
    setError(null);
    let spent = false;
    try {
      const promptToUse = customPrompt || DEFAULT_IMAGE_PROMPT_TEMPLATE(hukumnama?.summary || 'Sikh spirituality');
      await checkContentPolicy(promptToUse);
      await spend(CREDIT_COSTS.IMAGE);
      spent = true;
      const url = await generateStatusImage(promptToUse, size, '9:16');
      setImageUrl(url);
      if (user) {
        saveGeneration(user.uid, 'image', promptToUse, url, CREDIT_COSTS.IMAGE).catch(() => {});
      } else {
        addGuestGeneration({ type: 'image', prompt: promptToUse, resultUrl: url, creditsUsed: CREDIT_COSTS.IMAGE });
      }
      track('generation_done', { type: 'image', success: 1, credits_used: CREDIT_COSTS.IMAGE });
      window.dispatchEvent(new Event('generation-complete'));
    } catch (e) {
      track('generation_done', { type: 'image', success: 0, credits_used: 0 });
      if (spent) await refund(CREDIT_COSTS.IMAGE);
      setError(e instanceof ContentRejectedError ? e.message : t('errors.generateImage'));
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `hukumnama-status-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🖼️</span> {t('status.heading')}
            </h3>
            <span className="text-xs text-gray-400">⭐ {credits} credits</span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('status.promptLabel')}</label>
              <textarea
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-saffron-500 outline-none"
                rows={4}
                placeholder={hukumnama
                  ? t('status.promptPlaceholderSummary', { summary: hukumnama.summary })
                  : t('status.promptPlaceholder')}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('status.qualityLabel')}</label>
              <div className="flex space-x-2">
                {(['1K', '2K', '4K'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 rounded-md text-sm border ${size === s ? 'bg-saffron-50 border-saffron-500 text-saffron-700' : 'border-gray-200 text-gray-600'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="overlay"
                checked={showTextOverlay}
                onChange={(e) => setShowTextOverlay(e.target.checked)}
                className="rounded text-saffron-600 focus:ring-saffron-500"
              />
              <label htmlFor="overlay" className="text-sm text-gray-700">{t('status.textOverlay')}</label>
            </div>

            <Button onClick={handleGenerate} isLoading={loading} className="w-full">
              {!user
                ? t('generate.signInRequired')
                : loading
                  ? t('status.generating')
                  : t('status.generate', { cost: CREDIT_COSTS.IMAGE })}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-125 relative overflow-hidden shadow-inner border border-gray-200">
        {imageUrl ? (
          <div className="relative h-full w-full flex items-center justify-center p-4">
            <div className="relative aspect-9/16 h-full max-h-150 shadow-2xl rounded-lg overflow-hidden group">
              <img src={imageUrl} alt="Generated Status" className="w-full h-full object-cover" />

              {showTextOverlay && hukumnama && (
                <div className="absolute inset-0 bg-black/30 flex flex-col justify-center items-center p-6 text-center">
                  <div className="border-y-2 border-white/60 py-4 w-full backdrop-blur-sm bg-black/10">
                    <p className="text-white font-gurmukhi text-lg mb-2 drop-shadow-md line-clamp-6">
                      {hukumnama.gurmukhi}
                    </p>
                    <p className="text-saffron-200 text-xs uppercase tracking-widest mt-2 font-bold">
                      {t('status.overlayLabel')}
                    </p>
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Button variant="secondary" onClick={downloadImage}>{t('status.downloadImage')}</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p className="text-4xl mb-2">🎨</p>
            <p>{t('status.emptyMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusGenerator;
