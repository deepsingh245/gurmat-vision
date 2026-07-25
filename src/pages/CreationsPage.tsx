import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { getUserGenerations, softDeleteGeneration } from '@/firebase/firestore';
import type { Generation, GenerationType } from '@/types';

interface CreationsPageProps {
  onBack: () => void;
}

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_COLOR: Record<GenerationType, string> = {
  image:        'bg-blue-50 text-blue-700',
  'quote-card': 'bg-green-50 text-green-700',
  poster:       'bg-purple-50 text-purple-700',
  video:        'bg-red-50 text-red-700',
  reel:         'bg-pink-50 text-pink-700',
};

const TYPE_EMOJI: Record<GenerationType, string> = {
  image:        '🖼️',
  'quote-card': '🌿',
  poster:       '✍️',
  video:        '🎬',
  reel:         '🎥',
};

const isVideoType = (type: GenerationType) => type === 'video' || type === 'reel';

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'images' | 'videos';

function matchesFilter(type: GenerationType, filter: FilterTab): boolean {
  if (filter === 'all') return true;
  if (filter === 'videos') return isVideoType(type);
  return !isVideoType(type);
}

// ─── Download helper ──────────────────────────────────────────────────────────

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
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
    window.open(url, '_blank');
  }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

const MediaLightbox: React.FC<{ item: Generation; onClose: () => void }> = ({ item, onClose }) => {
  const { t } = useTranslation();
  const isVideo = isVideoType(item.type);
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `hukumnama-${item.type}-${item.id?.slice(0, 6) ?? 'file'}.${ext}`;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
        aria-label="Close"
      >
        ✕
      </button>

      {/* Media */}
      <div className="max-w-2xl w-full flex flex-col gap-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl bg-black">
          {isVideo ? (
            <video
              src={item.resultUrl}
              controls
              autoPlay
              className="w-full max-h-[75vh] object-contain"
            />
          ) : (
            <img
              src={item.resultUrl}
              alt={item.prompt}
              className="w-full max-h-[75vh] object-contain"
            />
          )}
        </div>

        {/* Prompt + actions */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-start justify-between gap-4">
          <p className="text-sm text-white/80 leading-relaxed line-clamp-3 flex-1">{item.prompt}</p>
          <button
            onClick={() => downloadFile(item.resultUrl, filename)}
            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            ⬇️ {t('creations.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item: Generation;
  onDelete: (id: string) => Promise<void>;
  onOpen: (item: Generation) => void;
}

const GenerationCard: React.FC<CardProps> = ({ item, onDelete, onOpen }) => {
  const { t } = useTranslation();
  const color = TYPE_COLOR[item.type] ?? 'bg-gray-50 text-gray-700';
  const emoji = TYPE_EMOJI[item.type] ?? '📄';
  const typeKey = `creations.type${item.type.charAt(0).toUpperCase() + item.type.slice(1).replace('-c', 'C')}` as const;
  const isVideo = isVideoType(item.type);
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `hukumnama-${item.type}-${item.id?.slice(0, 6) ?? 'file'}.${ext}`;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!item.id) return;
    setDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const typeLabel = (() => {
    const map: Record<GenerationType, string> = {
      image:        t('creations.typeImage'),
      'quote-card': t('creations.typeQuoteCard'),
      poster:       t('creations.typePoster'),
      video:        t('creations.typeVideo'),
      reel:         t('creations.typeReel'),
    };
    return map[item.type] ?? item.type;
  })();

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group">
      {/* Media preview — click opens lightbox */}
      <div
        className="relative aspect-square bg-gray-100 overflow-hidden cursor-zoom-in"
        onClick={() => onOpen(item)}
      >
        {isVideo ? (
          <video
            src={item.resultUrl}
            className="w-full h-full object-cover"
            muted
            playsInline
            onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
            onMouseLeave={e => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
          />
        ) : (
          <img
            src={item.resultUrl}
            alt={item.prompt}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <span className="bg-white/90 text-gray-900 rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg">
            🔍 View
          </span>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
            {emoji} {typeLabel}
          </span>
          <span className="text-xs text-gray-400">⭐ {item.creditsUsed}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 flex-1">{item.prompt}</p>

        {confirmDelete ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-xs py-1.5 bg-red-500 hover:bg-red-600 text-white rounded font-semibold disabled:opacity-60"
            >
              {deleting ? '...' : t('creations.confirmDelete')}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-xs py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-semibold"
            >
              {t('creations.cancel')}
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => downloadFile(item.resultUrl, filename)}
              className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600"
            >
              {t('creations.save')}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs py-1.5 px-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded"
              title="Delete"
            >
              🗑️
            </button>
          </div>
        )}
      </div>
    </div>
  );

  void typeKey; // suppress unused var lint — kept for type safety reference
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CreationsPage: React.FC<CreationsPageProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { guestGenerations, removeGuestGeneration } = useGuestSession();

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: 'all',    label: t('creations.filterAll') },
    { id: 'images', label: t('creations.filterImages') },
    { id: 'videos', label: t('creations.filterVideos') },
  ];

  // Declare all state at top — used by both guest and auth branches
  const [items, setItems]             = useState<Generation[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor]           = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore]         = useState(false);
  const [filter, setFilter]           = useState<FilterTab>('all');
  const [error, setError]             = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<Generation | null>(null);

  // ─── Guest branch ───────────────────────────────────────────────────────────
  if (!user) {
    const visible = guestGenerations.filter(i => !i.deleted && matchesFilter(i.type, filter));
    const guestDelete = async (id: string) => { removeGuestGeneration(id); };

    return (
      <>
      {lightboxItem && <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          {t('nav.back')}
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{t('creations.title')}</h2>
          {guestGenerations.length > 0 && (
            <span className="text-sm text-gray-400">
              {t('creations.sessionCount', { count: guestGenerations.length })}
            </span>
          )}
        </div>

        {guestGenerations.length > 0 && (
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.id ? 'bg-white shadow text-navy-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-4xl mb-4">🌿</p>
            <p className="font-semibold text-gray-700 mb-2">{t('creations.guestEmpty')}</p>
            <p className="text-sm text-gray-400 max-w-xs mx-auto mb-4">
              {t('creations.guestEmptyDesc')}
            </p>
            <button
              onClick={onBack}
              className="text-saffron-600 hover:text-saffron-700 text-sm font-semibold"
            >
              {t('creations.goToStudio')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visible.map(item => (
              <GenerationCard key={item.id} item={item} onDelete={guestDelete} onOpen={setLightboxItem} />
            ))}
          </div>
        )}
      </div>
      </>
    );
  }

  // ─── Auth branch (Firestore-backed) ─────────────────────────────────────────

  const fetchPage = useCallback(async (reset: boolean) => {
    reset ? setLoading(true) : setLoadingMore(true);
    setError(null);
    try {
      const { items: newItems, lastDoc } = await getUserGenerations(
        user.uid,
        12,
        reset ? undefined : cursor ?? undefined,
      );
      setItems(prev => reset ? newItems : [...prev, ...newItems]);
      setCursor(lastDoc);
      setHasMore(lastDoc !== null);
    } catch {
      setError(t('creations.loadError'));
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cursor]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchPage(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleAuthDelete = async (id: string) => {
    await softDeleteGeneration(id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const visible = items.filter(i => matchesFilter(i.type, filter));

  return (
    <>
    {lightboxItem && <MediaLightbox item={lightboxItem} onClose={() => setLightboxItem(null)} />}
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        {t('nav.back')}
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">{t('creations.title')}</h2>
        {items.length > 0 && (
          <span className="text-sm text-gray-400">
            {t('creations.itemCount', { count: items.length })}
          </span>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id ? 'bg-white shadow text-navy-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
          <button onClick={() => fetchPage(true)} className="ml-2 underline">{t('creations.retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-4xl mb-4">🌿</p>
          <p className="font-semibold text-gray-700 mb-2">
            {items.length === 0 ? t('creations.authEmpty') : t('creations.authEmptyFilter')}
          </p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {items.length === 0 ? t('creations.authEmptyDesc') : t('creations.authEmptyFilterDesc')}
          </p>
          {items.length === 0 && (
            <button onClick={onBack} className="mt-4 text-saffron-600 hover:text-saffron-700 text-sm font-semibold">
              {t('creations.goToStudio')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visible.map(item => (
              <GenerationCard key={item.id} item={item} onDelete={handleAuthDelete} onOpen={setLightboxItem} />
            ))}
          </div>

          {hasMore && filter === 'all' && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchPage(false)}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 shadow-sm"
              >
                {loadingMore ? t('creations.loadingMore') : t('creations.loadMore')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
};

export default CreationsPage;
