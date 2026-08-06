import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Sparkle, ChevronDown, Search, X, Download } from 'lucide-react';
import { TEMPLATES, CATEGORY_META } from '@/constants/templates';
import type { ContentTemplate, TemplateCategory } from '@/types';
import { CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { saveGeneration } from '@/firebase/firestore';
import { generateStatusImage, generateBackgroundVideo, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import { track } from '@/firebase/analytics';
import Button from './Button';

// ─── Prompt interpolation ─────────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key]?.trim() || `[${key}]`);
}

// ─── Category filter bar ──────────────────────────────────────────────────────

type CategoryFilter = 'all' | TemplateCategory;

// ─── Single template card ─────────────────────────────────────────────────────

const TemplateCard: React.FC<{ template: ContentTemplate }> = ({ template }) => {
  const { t } = useTranslation();
  const { credits, canAfford, refresh } = useCredits();
  const { user } = useAuth();
  const { addGuestGeneration } = useGuestSession();

  const [expanded, setExpanded] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    template.variables?.forEach(v => {
      defaults[v.key] = v.options?.[0] ?? '';
    });
    return defaults;
  });
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const overlayRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen]);

  const cost    = template.creditCost;
  const isVideo = template.mediaType === 'video';

  const allRequiredFilled = (template.variables ?? [])
    .filter(v => v.required)
    .every(v => vars[v.key]?.trim());

  const handleGenerate = async () => {
    if (!user) { window.dispatchEvent(new Event('hukumnama:require-auth')); return; }
    if (!canAfford(cost)) {
      setError(t('errors.notEnoughCredits', { need: cost, have: credits }));
      return;
    }
    track('generation_start', { type: isVideo ? 'reel' : 'image', template_id: template.id, credits_before: credits });
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prompt = interpolate(template.promptTemplate, vars);
      await checkContentPolicy(prompt);
      let url: string;
      if (isVideo) {
        url = await generateBackgroundVideo(prompt, '9:16');
        saveGeneration(user.uid, 'reel', prompt, url, cost).catch(() => {});
      } else {
        ({ url } = await generateStatusImage(prompt, '1K', template.aspectRatio ?? '9:16'));
        saveGeneration(user.uid, 'image', prompt, url, cost).catch(() => {});
      }
      setResult(url);
      track('generation_done', { type: isVideo ? 'reel' : 'image', success: 1, credits_used: cost });
      window.dispatchEvent(new Event('generation-complete'));
    } catch (e) {
      track('generation_done', { type: isVideo ? 'reel' : 'image', success: 0, credits_used: 0 });
      setError(e instanceof ContentRejectedError
        ? e.message
        : isVideo ? t('errors.generateVideo') : t('errors.generateImage'));
      console.error(e);
    } finally {
      setLoading(false);
      await refresh();
    }
  };

  const handleDownload = async () => {
    if (!result) return;
    const ext = isVideo ? 'mp4' : 'png';
    const filename = `${template.id}-${Date.now()}.${ext}`;
    try {
      const res = await fetch(result);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(result, '_blank');
    }
  };

  if (isVideo) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm opacity-60">
        <div className="p-4 flex items-start gap-3">
          <span className="mt-0.5 shrink-0">
            {typeof template.icon === 'string'
              ? <span className="text-2xl">{template.icon}</span>
              : <template.icon className="w-6 h-6 text-gray-300" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-gray-400 text-sm">
                {t(`templateData.${template.id}.name`, { defaultValue: template.name })}
              </p>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-400">
                Coming Soon
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-0.5">Video generation temporarily unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border transition-shadow ${expanded ? 'border-saffron-300 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => { const opening = !expanded; setExpanded(e => !e); setResult(null); setError(null); if (opening) track('template_view', { template_id: template.id, category: template.category }); }}
      >
        <span className="mt-0.5 shrink-0">
          {typeof template.icon === 'string'
            ? <span className="text-2xl">{template.icon}</span>
            : <template.icon className="w-6 h-6 text-saffron-600" />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm">
              {t(`templateData.${template.id}.name`, { defaultValue: template.name })}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVideo ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {isVideo ? t('templates.typeVideo') : t('templates.typeImage')}
              </span>
              <span className="text-xs text-gray-400 font-medium">{cost}⭐</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
            {t(`templateData.${template.id}.desc`, { defaultValue: template.description })}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 mt-1 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-4">
          {(template.variables ?? []).map(variable => (
            <div key={variable.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t(`templateData.${template.id}.var_${variable.key}`, { defaultValue: variable.label })}
                {variable.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {variable.type === 'select' ? (
                <div className="flex flex-wrap gap-1.5">
                  {variable.options?.map(opt => (
                    <button
                      key={opt}
                      onClick={() => setVars(v => ({ ...v, [variable.key]: opt }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        vars[variable.key] === opt
                          ? 'bg-saffron-500 text-white border-saffron-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-saffron-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={vars[variable.key] ?? ''}
                  onChange={e => setVars(v => ({ ...v, [variable.key]: e.target.value }))}
                  placeholder={t(`templateData.${template.id}.var_${variable.key}_ph`, { defaultValue: variable.placeholder ?? '' })}
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
          )}

          {result && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              <button
                className="w-full relative group cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
                aria-label="View full size"
              >
                {isVideo ? (
                  <video src={result} autoPlay loop muted className="w-full max-h-64 object-cover bg-black pointer-events-none" />
                ) : (
                  <img src={result} alt="Generated" className="w-full max-h-64 object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-3 py-1 rounded-full transition-opacity">View full</span>
                </div>
              </button>
              <div className="p-2 bg-gray-50 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 text-xs py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                >
                  {t('templates.download')}
                </button>
                <button
                  onClick={() => setResult(null)}
                  className="text-xs py-2 px-3 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg bg-white"
                >
                  {t('templates.redo')}
                </button>
              </div>
            </div>
          )}

          {lightboxOpen && result && (
            <div
              ref={overlayRef}
              className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
              onClick={e => { if (e.target === overlayRef.current) setLightboxOpen(false); }}
            >
              <button
                onClick={() => setLightboxOpen(false)}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="max-w-2xl w-full flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden shadow-2xl bg-black">
                  {isVideo ? (
                    <video src={result} controls autoPlay className="w-full max-h-[75vh] object-contain" />
                  ) : (
                    <img src={result} alt="Generated" className="w-full max-h-[75vh] object-contain" />
                  )}
                </div>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" /> {t('templates.download')}
                  </button>
                  <button
                    onClick={() => setLightboxOpen(false)}
                    className="flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {!result && (
            <Button
              onClick={handleGenerate}
              isLoading={loading}
              disabled={!allRequiredFilled}
              className="w-full"
            >
              {!user
                ? t('generate.signInRequired')
                : loading
                  ? (isVideo ? t('templates.generatingVideo') : t('templates.generatingImage'))
                  : t('templates.generate', { count: cost, cost })}
            </Button>
          )}

          {isVideo && !result && (
            <p className="text-xs text-amber-600 text-center bg-amber-50 border border-amber-200 rounded-lg p-2">
              {t('templates.videoNote')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main browser ─────────────────────────────────────────────────────────────

const TemplatesBrowser: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  const ALL_FILTERS: { id: CategoryFilter; label: string; icon: typeof Sparkle | string }[] = [
    { id: 'all', label: t('templates.filterAll'), icon: Sparkle },
    ...Object.entries(CATEGORY_META).map(([id, meta]) => ({
      id: id as TemplateCategory,
      label: t(`templateCategories.${id}`, { defaultValue: meta.label }),
      icon: meta.icon,
    })),
  ];

  const filtered = TEMPLATES.filter(tp => {
    const categoryMatch = activeCategory === 'all' || tp.category === activeCategory;
    const searchMatch   = search === '' ||
      tp.name.toLowerCase().includes(search.toLowerCase()) ||
      tp.tags.some(tag => tag.includes(search.toLowerCase()));
    return categoryMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5" /> {t('templates.heading')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {t('templates.subheading', { count: TEMPLATES.length })}
        </p>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('templates.searchPlaceholder')}
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-saffron-500 outline-none mb-4"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {ALL_FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveCategory(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === f.id
                  ? 'bg-navy-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {typeof f.icon === 'string' ? <span>{f.icon}</span> : <f.icon className="w-3.5 h-3.5" />} {f.label}
            </button>
          ))}
        </div>
      </div>

      {(search || activeCategory !== 'all') && (
        <p className="text-sm text-gray-400 px-1">
          {t('templates.found', { count: filtered.length })}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Search className="w-8 h-8 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">{t('templates.noMatch')}</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('all'); }}
            className="mt-3 text-saffron-600 text-sm hover:underline"
          >
            {t('templates.clearFilters')}
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(tp => (
            <TemplateCard key={tp.id} template={tp} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesBrowser;
