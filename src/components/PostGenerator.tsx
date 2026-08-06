import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HukumnamaData, GeneratedPost } from '@/types';
import { SOCIAL_TEMPLATES, CREDIT_COSTS } from '@/constants';
import { generateSocialPost, generateStatusImage } from '@/services/geminiService';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { saveGeneration } from '@/firebase/firestore';
import { track } from '@/firebase/analytics';
import Button from './Button';

interface PostGeneratorProps {
  hukumnama: HukumnamaData | null;
}

const PostGenerator: React.FC<PostGeneratorProps> = ({ hukumnama }) => {
  const { t } = useTranslation();
  const { credits, canAfford, refresh } = useCredits();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [selectedTemplate, setSelectedTemplate] = useState(SOCIAL_TEMPLATES[0].id);
  const [language, setLanguage]                 = useState('English');
  const [loading, setLoading]                   = useState(false);
  const [generatedPost, setGeneratedPost]       = useState<GeneratedPost | null>(null);
  const [generatedImage, setGeneratedImage]     = useState<string | null>(null);
  const [imgLoading, setImgLoading]             = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  const handleGenerateText = async () => {
    if (!hukumnama) return;
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(CREDIT_COSTS.QUOTE_CARD)) {
      setError(t('errors.notEnoughCredits', { need: CREDIT_COSTS.QUOTE_CARD, have: credits }));
      return;
    }
    track('generation_start', { type: 'post-text', credits_before: credits });
    setLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const template = SOCIAL_TEMPLATES.find(tp => tp.id === selectedTemplate);
      const post = await generateSocialPost(hukumnama, template?.stylePrompt || '', language);
      setGeneratedPost(post);
      track('generation_done', { type: 'post-text', success: 1, credits_used: CREDIT_COSTS.QUOTE_CARD });
    } catch {
      track('generation_done', { type: 'post-text', success: 0, credits_used: 0 });
      setError(t('errors.generatePost'));
    } finally {
      setLoading(false);
      await refresh();
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedPost) return;
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(CREDIT_COSTS.IMAGE)) {
      setError(t('errors.notEnoughCredits', { need: CREDIT_COSTS.IMAGE, have: credits }));
      return;
    }
    track('generation_start', { type: 'poster', credits_before: credits });
    setImgLoading(true);
    setError(null);
    try {
      const url = await generateStatusImage(generatedPost.imagePrompt, '1K', '1:1');
      setGeneratedImage(url);
      saveGeneration(user.uid, 'poster', generatedPost.imagePrompt, url, CREDIT_COSTS.IMAGE).catch(() => {});
      track('generation_done', { type: 'poster', success: 1, credits_used: CREDIT_COSTS.IMAGE });
      window.dispatchEvent(new Event('generation-complete'));
    } catch {
      track('generation_done', { type: 'poster', success: 0, credits_used: 0 });
      setError(t('errors.generateImage'));
    } finally {
      setImgLoading(false);
      await refresh();
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 animate-fade-in-up">
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">✍️ {t('post.heading')}</h3>
            <span className="text-xs text-gray-400">⭐ {credits} credits</span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.styleLabel')}</label>
              <div className="grid grid-cols-2 gap-2">
                {SOCIAL_TEMPLATES.map(tp => (
                  <button
                    key={tp.id}
                    onClick={() => setSelectedTemplate(tp.id)}
                    className={`p-2 text-xs rounded-lg border text-left transition-colors ${selectedTemplate === tp.id ? 'bg-saffron-50 border-saffron-500 text-saffron-900' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="font-bold">{tp.name}</div>
                    <div className="text-gray-500 line-clamp-1">{tp.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('post.languageLabel')}</label>
              <div className="flex gap-2">
                {[
                  { key: 'English', label: t('post.langEnglish') },
                  { key: 'Punjabi', label: t('post.langPunjabi') },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setLanguage(key)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium ${language === key ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={handleGenerateText} isLoading={loading} disabled={!hukumnama} className="w-full">
              {!user
                ? t('generate.signInRequired')
                : loading
                  ? '...'
                  : t('post.generateText', { cost: CREDIT_COSTS.QUOTE_CARD })}
            </Button>
          </div>
        </div>

        {generatedPost && (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-2">{t('post.generatedHeading')}</h4>
            <input className="w-full font-bold text-lg mb-2 border-b border-transparent hover:border-gray-200 outline-none" value={generatedPost.title} readOnly />
            <textarea className="w-full text-sm text-gray-600 min-h-25 mb-2 outline-none resize-none" value={generatedPost.body} readOnly />
            <div className="text-blue-600 text-sm mb-4">{generatedPost.hashtags.join(' ')}</div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(`${generatedPost.title}\n\n${generatedPost.body}\n\n${generatedPost.hashtags.join(' ')}`); track('share', { type: 'post', platform: 'clipboard' }); }} className="flex-1 text-xs">
                {t('post.copyText')}
              </Button>
              <Button variant="primary" onClick={handleGenerateImage} isLoading={imgLoading} className="flex-1 text-xs">
                {t('post.generateImage', { cost: CREDIT_COSTS.IMAGE })}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-100 rounded-2xl flex items-center justify-center min-h-125 relative overflow-hidden shadow-inner border border-gray-200">
        {generatedImage ? (
          <div className="relative w-full max-w-sm aspect-square shadow-2xl bg-white p-2">
            <img src={generatedImage} alt="Post Background" className="w-full h-full object-cover" />
            {generatedPost && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/40 text-white">
                <h2 className="font-bold text-xl mb-2 drop-shadow-lg">{generatedPost.title}</h2>
                <p className="text-sm drop-shadow-md line-clamp-6">{generatedPost.body}</p>
                <div className="absolute bottom-4 text-xs opacity-75">{t('post.watermark')}</div>
              </div>
            )}
            <a href={generatedImage} download="post-image.png" className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow text-gray-900 hover:bg-white">
              ⬇️
            </a>
          </div>
        ) : (
          <div className="text-center text-gray-400 p-8">
            <p className="text-4xl mb-2">📝</p>
            <p>{t('post.emptyMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostGenerator;
