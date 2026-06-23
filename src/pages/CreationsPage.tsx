import React, { useState, useEffect, useCallback } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { getUserGenerations, softDeleteGeneration } from '@/firebase/firestore';
import type { Generation, GenerationType } from '@/types';

interface CreationsPageProps {
  onBack: () => void;
}

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<GenerationType, { label: string; emoji: string; color: string }> = {
  image:       { label: 'Image',      emoji: '🖼️',  color: 'bg-blue-50 text-blue-700' },
  'quote-card':{ label: 'Quote Card', emoji: '🌿',  color: 'bg-green-50 text-green-700' },
  poster:      { label: 'Poster',     emoji: '✍️',  color: 'bg-purple-50 text-purple-700' },
  video:       { label: 'Video',      emoji: '🎬',  color: 'bg-red-50 text-red-700' },
  reel:        { label: 'Reel',       emoji: '🎥',  color: 'bg-pink-50 text-pink-700' },
};

const isVideoType = (type: GenerationType) => type === 'video' || type === 'reel';

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'images' | 'videos';

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',    label: 'All' },
  { id: 'images', label: 'Images' },
  { id: 'videos', label: 'Videos' },
];

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

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  item: Generation;
  onDelete: (id: string) => void;
}

const GenerationCard: React.FC<CardProps> = ({ item, onDelete }) => {
  const meta = TYPE_LABELS[item.type] ?? { label: item.type, emoji: '📄', color: 'bg-gray-50 text-gray-700' };
  const isVideo = isVideoType(item.type);
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `hukumnama-${item.type}-${item.id?.slice(0, 6) ?? 'file'}.${ext}`;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!item.id) return;
    setDeleting(true);
    try {
      await softDeleteGeneration(item.id);
      onDelete(item.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col group">
      {/* Media preview */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
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
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={() => downloadFile(item.resultUrl, filename)}
            className="bg-white text-gray-900 rounded-full p-2 shadow-lg hover:bg-saffron-50 transition-colors"
            title="Download"
          >
            ⬇️
          </button>
        </div>
      </div>

      {/* Info row */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
            {meta.emoji} {meta.label}
          </span>
          <span className="text-xs text-gray-400">⭐ {item.creditsUsed}</span>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 flex-1">{item.prompt}</p>

        {/* Actions */}
        {confirmDelete ? (
          <div className="flex gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 text-xs py-1.5 bg-red-500 hover:bg-red-600 text-white rounded font-semibold disabled:opacity-60"
            >
              {deleting ? '...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 text-xs py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded font-semibold"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={() => downloadFile(item.resultUrl, filename)}
              className="flex-1 text-xs py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded text-gray-600"
            >
              ⬇️ Save
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
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const CreationsPage: React.FC<CreationsPageProps> = ({ onBack }) => {
  const { user } = useAuth();

  const [items, setItems]                   = useState<Generation[]>([]);
  const [loading, setLoading]               = useState(true);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [cursor, setCursor]                 = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore]               = useState(false);
  const [filter, setFilter]                 = useState<FilterTab>('all');
  const [error, setError]                   = useState<string | null>(null);

  const fetchPage = useCallback(async (reset: boolean) => {
    if (!user) return;
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
      setError('Failed to load creations. Please try again.');
    } finally {
      reset ? setLoading(false) : setLoadingMore(false);
    }
  }, [user, cursor]);

  useEffect(() => {
    fetchPage(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDelete = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const visible = items.filter(i => matchesFilter(i.type, filter));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        ← Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">My Creations</h2>
        {items.length > 0 && (
          <span className="text-sm text-gray-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Filter tabs */}
      {items.length > 0 && (
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.id
                  ? 'bg-white shadow text-navy-900'
                  : 'text-gray-500 hover:text-gray-700'
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
          <button onClick={() => fetchPage(true)} className="ml-2 underline">Retry</button>
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
            {items.length === 0 ? 'No creations yet' : `No ${filter} found`}
          </p>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            {items.length === 0
              ? 'Your generated images, videos, and quote cards will appear here.'
              : 'Try a different filter or generate new content.'}
          </p>
          {items.length === 0 && (
            <button onClick={onBack} className="mt-4 text-saffron-600 hover:text-saffron-700 text-sm font-semibold">
              Go to Studio →
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visible.map(item => (
              <GenerationCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>

          {hasMore && filter === 'all' && (
            <div className="mt-8 text-center">
              <button
                onClick={() => fetchPage(false)}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 shadow-sm"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CreationsPage;
