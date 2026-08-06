import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf, Star, Palette, Clapperboard, Copy } from 'lucide-react';
import { generateQuotePack, generateStatusImage, generateBackgroundVideo, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import { GurbaniQuote } from '@/types';
import { CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { saveGeneration } from '@/firebase/firestore';
import { track } from '@/firebase/analytics';
import Button from './Button';

const QuotePackGenerator: React.FC = () => {
  const { t } = useTranslation();
  const { credits, canAfford, refresh } = useCredits();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [topic, setTopic]               = useState('');
  const [quotes, setQuotes]             = useState<GurbaniQuote[]>([]);
  const [loading, setLoading]           = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [mediaUrls, setMediaUrls]       = useState<{ [key: number]: { img?: string; vid?: string } }>({});
  const [error, setError]               = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic) return;
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(CREDIT_COSTS.QUOTE_PACK)) {
      setError(t('errors.notEnoughCredits', { need: CREDIT_COSTS.QUOTE_PACK, have: credits }));
      return;
    }
    track('generation_start', { type: 'quote-pack', credits_before: credits });
    setLoading(true);
    setError(null);
    setQuotes([]);
    setMediaUrls({});
    try {
      await checkContentPolicy(topic);
      const data = await generateQuotePack(topic, 5);
      setQuotes(data);
      track('generation_done', { type: 'quote-pack', success: 1, credits_used: CREDIT_COSTS.QUOTE_PACK });
    } catch (e) {
      track('generation_done', { type: 'quote-pack', success: 0, credits_used: 0 });
      setError(e instanceof ContentRejectedError ? e.message : t('errors.generateQuotes'));
    } finally {
      setLoading(false);
      await refresh();
    }
  };

  const generateMedia = async (index: number, type: 'image' | 'video') => {
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    const cost = type === 'image' ? CREDIT_COSTS.IMAGE : CREDIT_COSTS.VIDEO;
    if (!canAfford(cost)) {
      setError(t('errors.notEnoughCredits', { need: cost, have: credits }));
      return;
    }
    track('generation_start', { type: type === 'image' ? 'quote-card' : 'reel', credits_before: credits });
    setProcessingId(index);
    setError(null);
    try {
      const quote = quotes[index];
      if (type === 'image') {
        const { url } = await generateStatusImage(quote.imagePrompt, '1K', '1:1');
        setMediaUrls(prev => ({ ...prev, [index]: { ...prev[index], img: url } }));
        saveGeneration(user.uid, 'quote-card', quote.imagePrompt, url, cost).catch(() => {});
      } else {
        const url = await generateBackgroundVideo(quote.videoPrompt, '9:16');
        setMediaUrls(prev => ({ ...prev, [index]: { ...prev[index], vid: url } }));
        saveGeneration(user.uid, 'reel', quote.videoPrompt, url, cost).catch(() => {});
      }
      track('generation_done', { type: type === 'image' ? 'quote-card' : 'reel', success: 1, credits_used: cost });
      window.dispatchEvent(new Event('generation-complete'));
    } catch {
      track('generation_done', { type: type === 'image' ? 'quote-card' : 'reel', success: 0, credits_used: 0 });
      setError(t('errors.generateMedia', { type }));
    } finally {
      setProcessingId(null);
      await refresh();
    }
  };

  return (
    <div className="animate-fade-in-up space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center max-w-2xl mx-auto">
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2"><Leaf className="w-5 h-5" /> {t('quotes.heading')}</h3>
        <p className="text-gray-500 mb-1 text-sm">{t('quotes.subheading')}</p>
        <p className="text-xs text-gray-400 mb-4 inline-flex items-center gap-1">
          Pack: {CREDIT_COSTS.QUOTE_PACK} credit · Image: {CREDIT_COSTS.IMAGE} credit · Video: {CREDIT_COSTS.VIDEO} credits &nbsp;|&nbsp; <Star className="w-3 h-3" /> {credits} available
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder={t('quotes.topicPlaceholder')}
            className="flex-1 p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-saffron-500"
          />
          <Button onClick={handleGenerate} isLoading={loading} className="shrink-0">
            {!user
              ? t('generate.signInRequired')
              : loading
                ? '...'
                : t('quotes.generate', { cost: CREDIT_COSTS.QUOTE_PACK })}
          </Button>
        </div>
      </div>

      {quotes.length > 0 && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quotes.map((quote, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="text-saffron-600 font-gurmukhi text-lg mb-2 text-center">{quote.gurmukhi}</div>
                <div className="text-xs text-gray-400 italic mb-2 text-center">{quote.transliteration}</div>
                <p className="text-gray-800 font-medium text-center mb-4">"{quote.translation}"</p>
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600">
                  <strong>{t('quotes.reflection')}</strong> {quote.reflection}
                </div>
              </div>

              {(mediaUrls[idx]?.img || mediaUrls[idx]?.vid) && (
                <div className="relative h-48 bg-black">
                  {mediaUrls[idx]?.vid ? (
                    <video src={mediaUrls[idx].vid} controls className="w-full h-full object-cover" />
                  ) : (
                    <img src={mediaUrls[idx].img} alt="Quote Background" className="w-full h-full object-cover" />
                  )}
                </div>
              )}

              <div className="p-3 bg-gray-50 border-t border-gray-100 flex gap-2 justify-between">
                <button
                  onClick={() => generateMedia(idx, 'image')}
                  disabled={!!processingId}
                  className="flex-1 py-2 bg-white border border-gray-200 rounded hover:bg-gray-100 text-xs font-semibold text-gray-700 disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {processingId === idx ? '...' : <><Palette className="w-3.5 h-3.5" /> Image ({CREDIT_COSTS.IMAGE}<Star className="w-3 h-3 inline" />)</>}
                </button>
                <button
                  disabled
                  title="Video generation coming soon"
                  className="flex-1 py-2 bg-gray-50 border border-gray-100 rounded text-xs font-semibold text-gray-300 flex items-center justify-center gap-1 cursor-not-allowed"
                >
                  <Clapperboard className="w-3.5 h-3.5" /> Video (Soon)
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${quote.gurmukhi}\n${quote.translation}`); track('share', { type: 'quote', platform: 'clipboard' }); }}
                  className="py-2 px-3 text-gray-500 hover:text-navy-900"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuotePackGenerator;
