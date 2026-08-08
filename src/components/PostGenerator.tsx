import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PenLine, Star, Download, FileText, Share2 } from 'lucide-react';
import { HukumnamaData, GeneratedPost } from '@/types';
import { SOCIAL_TEMPLATES, CREDIT_COSTS } from '@/constants';
import { generateSocialPost, generateStatusImage } from '@/services/geminiService';
import { useCredits } from '@/hooks/useCredits';
import { useShare } from '@/hooks/useShare';
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
  const { shareImage } = useShare();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [selectedTemplate, setSelectedTemplate] = useState(SOCIAL_TEMPLATES[0].id);
  const [language, setLanguage]                 = useState('English');
  const [loading, setLoading]                   = useState(false);
  const [generatedPost, setGeneratedPost]       = useState<GeneratedPost | null>(null);
  const [generatedImage, setGeneratedImage]     = useState<string | null>(null);
  const [generatedImageData, setGeneratedImageData] = useState<string | null>(null);
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
    setGeneratedImageData(null);
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

  const handleDownloadComposite = async () => {
    if (!generatedImageData || !generatedPost) return;
    try {
      const img = new Image();
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = generatedImageData; });

      const size = Math.max(img.naturalWidth, img.naturalHeight) || 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      ctx.drawImage(img, 0, 0, size, size);

      // dark overlay
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.fillRect(0, 0, size, size);

      const pad = size * 0.1;
      const maxW = size - pad * 2;
      const cx = size / 2;

      function wrapText(text: string, fontSize: number): string[] {
        ctx.font = `bold ${fontSize}px sans-serif`;
        const words = text.split(' ');
        const lines: string[] = [];
        let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; }
          else line = test;
        }
        if (line) lines.push(line);
        return lines;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffffff';

      const titleSz = Math.round(size * 0.055);
      const bodySz  = Math.round(size * 0.033);
      const titleLines = wrapText(generatedPost.title, titleSz);
      ctx.font = `${bodySz}px sans-serif`;
      const bodyLines  = generatedPost.body.split(' ').reduce<string[]>((acc, word) => {
        const last = acc[acc.length - 1] ?? '';
        const test = last ? `${last} ${word}` : word;
        if (ctx.measureText(test).width > maxW && last) return [...acc, word];
        return [...acc.slice(0, -1), test];
      }, ['']).slice(0, 6);

      const titleLH = titleSz * 1.35;
      const bodyLH  = bodySz  * 1.6;
      const gap     = size * 0.03;
      const totalH  = titleLines.length * titleLH + gap + bodyLines.length * bodyLH;
      let y = (size - totalH) / 2;

      ctx.font = `bold ${titleSz}px sans-serif`;
      for (const line of titleLines) { ctx.fillText(line, cx, y); y += titleLH; }

      y += gap;
      ctx.font = `${bodySz}px sans-serif`;
      for (const line of bodyLines) { ctx.fillText(line, cx, y); y += bodyLH; }

      // watermark
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `${Math.round(size * 0.025)}px sans-serif`;
      ctx.fillText(t('post.watermark'), cx, size - pad * 0.8);

      canvas.toBlob(blob => {
        if (!blob) { window.open(generatedImage, '_blank'); return; }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'post-image.png';
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      window.open(generatedImage ?? '', '_blank');
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
      const { url, dataUri } = await generateStatusImage(generatedPost.imagePrompt, '1K', '1:1');
      setGeneratedImage(url);
      setGeneratedImageData(dataUri);
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
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><PenLine className="w-5 h-5" /> {t('post.heading')}</h3>
            <span className="text-xs text-gray-400 inline-flex items-center gap-1"><Star className="w-3 h-3" /> {credits} credits</span>
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
            <button onClick={handleDownloadComposite} className="absolute bottom-2 right-2 bg-white/90 p-2 rounded-full shadow text-gray-900 hover:bg-white">
              <Download className="w-4 h-4" />
            </button>
            {generatedImageData && (
              <button onClick={() => shareImage(generatedImageData, 'post-image.png', generatedPost?.title ?? '')} className="absolute bottom-2 left-2 bg-white/90 p-2 rounded-full shadow text-saffron-600 hover:bg-white">
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 p-8">
            <FileText className="w-10 h-10 mx-auto mb-2" />
            <p>{t('post.emptyMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostGenerator;
