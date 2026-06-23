import React, { useState } from 'react';
import { TEMPLATES, CATEGORY_META } from '@/constants/templates';
import type { ContentTemplate, TemplateCategory } from '@/types';
import { CREDIT_COSTS } from '@/constants';
import { useCredits } from '@/hooks/useCredits';
import { useAuth } from '@/contexts/AuthContext';
import { saveGeneration } from '@/firebase/firestore';
import { generateStatusImage, generateBackgroundVideo, checkContentPolicy, ContentRejectedError } from '@/services/geminiService';
import Button from './Button';

// ─── Prompt interpolation ─────────────────────────────────────────────────────

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key]?.trim() || `[${key}]`);
}

// ─── Category filter bar ──────────────────────────────────────────────────────

type CategoryFilter = 'all' | TemplateCategory;

const ALL_FILTERS: { id: CategoryFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '🌟' },
  ...Object.entries(CATEGORY_META).map(([id, meta]) => ({
    id: id as TemplateCategory,
    label: meta.label,
    emoji: meta.emoji,
  })),
];

// ─── Single template card ─────────────────────────────────────────────────────

const TemplateCard: React.FC<{ template: ContentTemplate }> = ({ template }) => {
  const { credits, canAfford, spend, refund } = useCredits();
  const { user } = useAuth();

  const [expanded, setExpanded] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    template.variables?.forEach(v => {
      defaults[v.key] = v.options?.[0] ?? '';
    });
    return defaults;
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cost = template.creditCost;
  const isVideo = template.mediaType === 'video';

  const allRequiredFilled = (template.variables ?? [])
    .filter(v => v.required)
    .every(v => vars[v.key]?.trim());

  const handleGenerate = async () => {
    if (!canAfford(cost)) {
      setError(`Not enough credits. You need ${cost} but have ${credits}.`);
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    let spent = false;
    try {
      const prompt = interpolate(template.promptTemplate, vars);
      await checkContentPolicy(prompt);
      await spend(cost);
      spent = true;
      let url: string;
      if (isVideo) {
        url = await generateBackgroundVideo(prompt, '9:16');
        if (user) saveGeneration(user.uid, 'reel', prompt, url, cost).catch(() => {});
      } else {
        url = await generateStatusImage(prompt, '1K', template.aspectRatio ?? '9:16');
        if (user) saveGeneration(user.uid, 'image', prompt, url, cost).catch(() => {});
      }
      setResult(url);
      window.dispatchEvent(new Event('generation-complete'));
    } catch (e) {
      if (spent) await refund(cost);
      setError(e instanceof ContentRejectedError
        ? e.message
        : isVideo ? 'Video generation failed. Please try again.' : 'Image generation failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
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

  return (
    <div className={`bg-white rounded-2xl border transition-shadow ${expanded ? 'border-saffron-300 shadow-lg' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
      {/* Header — always visible */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => { setExpanded(e => !e); setResult(null); setError(null); }}
      >
        <span className="text-2xl mt-0.5 shrink-0">{template.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-gray-900 text-sm">{template.name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isVideo ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                {isVideo ? '🎬 Video' : '🖼️ Image'}
              </span>
              <span className="text-xs text-gray-400 font-medium">{cost}⭐</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{template.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {template.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        </div>
        <span className={`text-gray-400 text-xs mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 pt-4 space-y-4">
          {/* Variable inputs */}
          {(template.variables ?? []).map(variable => (
            <div key={variable.key}>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {variable.label}
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
                  placeholder={variable.placeholder}
                  className="w-full text-sm p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-saffron-500 outline-none"
                />
              )}
            </div>
          ))}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-xl overflow-hidden border border-gray-100">
              {isVideo ? (
                <video src={result} controls autoPlay loop className="w-full max-h-64 object-cover bg-black" />
              ) : (
                <img src={result} alt="Generated" className="w-full max-h-64 object-cover" />
              )}
              <div className="p-2 bg-gray-50 flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 text-xs py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium text-gray-700"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => { setResult(null); }}
                  className="text-xs py-2 px-3 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg bg-white"
                >
                  ↺ Redo
                </button>
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
              {loading
                ? (isVideo ? 'Generating video (1–2 min)…' : 'Generating image…')
                : `Generate — ${cost} credit${cost !== 1 ? 's' : ''}`}
            </Button>
          )}

          {isVideo && !result && (
            <p className="text-xs text-amber-600 text-center bg-amber-50 border border-amber-200 rounded-lg p-2">
              ⏳ Video generation takes 1–2 minutes. Please wait after clicking.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main browser ─────────────────────────────────────────────────────────────

const TemplatesBrowser: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t => {
    const categoryMatch = activeCategory === 'all' || t.category === activeCategory;
    const searchMatch = search === '' ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tags.some(tag => tag.includes(search.toLowerCase()));
    return categoryMatch && searchMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-1">✨ Sikh Content Templates</h3>
        <p className="text-sm text-gray-500 mb-4">
          {TEMPLATES.length} curated templates — pick one, customise, generate.
        </p>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search templates…"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-saffron-500 outline-none mb-4"
        />

        {/* Category pills */}
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
              <span>{f.emoji}</span> {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {(search || activeCategory !== 'all') && (
        <p className="text-sm text-gray-400 px-1">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-gray-500 font-medium">No templates match your search</p>
          <button
            onClick={() => { setSearch(''); setActiveCategory('all'); }}
            className="mt-3 text-saffron-600 text-sm hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(t => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplatesBrowser;
