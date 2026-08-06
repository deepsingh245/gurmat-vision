import React, { useState, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config';

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'users' | 'generations' | 'moderation' | 'adstats';

interface UserRow {
  id: string;
  name?: string;
  email?: string;
  credits?: number;
  plan?: string;
  createdAt?: { _seconds: number };
}

interface GenerationRow {
  id: string;
  type?: string;
  prompt?: string;
  resultUrl?: string;
  creditsUsed?: number;
  createdAt?: { _seconds: number };
  userId?: string;
}

interface RefusalRow {
  id: string;
  prompt?: string;
  reason?: string;
  severity?: 'none' | 'low' | 'medium' | 'high';
  source?: string;
  userId?: string;
  createdAt?: { _seconds: number };
}

interface AdStats {
  rewardedCompletions: number;
  creditsGranted: number;
  bannerImpressions: number;
  interstitialImpressions: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(ts?: { _seconds: number }): string {
  if (!ts) return '—';
  return new Date(ts._seconds * 1000).toLocaleDateString();
}

function truncate(s: string | undefined, n: number): string {
  if (!s) return '—';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

const SEVERITY_COLORS: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-yellow-100 text-yellow-700',
  none:   'bg-gray-100 text-gray-500',
};

// ─── Adjust Credits Modal ─────────────────────────────────────────────────────

const AdjustModal: React.FC<{
  uid: string;
  name: string;
  onClose: () => void;
  onDone: (uid: string, newCredits: number) => void;
}> = ({ uid, name, onClose, onDone }) => {
  const [delta, setDelta]   = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const submit = async () => {
    const n = parseInt(delta, 10);
    if (isNaN(n) || n === 0) { setError('Enter a non-zero integer.'); return; }
    if (!reason.trim()) { setError('Reason is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<
        { uid: string; delta: number; reason: string },
        { newCredits: number }
      >(functions, 'hukumnamaAdminAdjustCredits');
      const res = await fn({ uid, delta: n, reason: reason.trim() });
      onDone(uid, res.data.newCredits);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to adjust credits.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-bold text-gray-900">Adjust Credits — {name}</h3>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Delta (positive = add, negative = deduct)</label>
          <input
            type="number"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="e.g. 10 or -5"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Bonus for feedback, etc."
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab: React.FC = () => {
  const [search, setSearch]   = useState('');
  const [rows, setRows]       = useState<UserRow[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [adjustUid, setAdjustUid] = useState<{ uid: string; name: string } | null>(null);

  const load = useCallback(async (emailSearch?: string) => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<{ emailSearch?: string }, UserRow[]>(
        functions, 'hukumnamaAdminGetUsers'
      );
      const res = await fn({ emailSearch: emailSearch?.trim() });
      setRows(res.data);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => load(search);
  const handleDone = (uid: string, newCredits: number) => {
    setRows(r => r.map(u => u.id === uid ? { ...u, credits: newCredits } : u));
  };

  return (
    <div className="space-y-4">
      {adjustUid && (
        <AdjustModal
          uid={adjustUid.uid}
          name={adjustUid.name}
          onClose={() => setAdjustUid(null)}
          onDone={handleDone}
        />
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search by email…"
          className="flex-1 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '…' : 'Search'}
        </button>
        {!loaded && (
          <button
            onClick={() => load()}
            disabled={loading}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            Load All
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loaded && (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Name</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Email</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Credits</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Plan</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Joined</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found.</td></tr>
              ) : rows.map(u => (
                <tr key={u.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                  <td className="px-4 py-3 font-bold text-saffron-600">{u.credits ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">{u.plan || 'free'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setAdjustUid({ uid: u.id, name: u.name || u.email || u.id })}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      Adjust Credits
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Generations Tab ──────────────────────────────────────────────────────────

const GenerationsTab: React.FC = () => {
  const [typeFilter, setTypeFilter] = useState('');
  const [uidFilter, setUidFilter]   = useState('');
  const [rows, setRows]             = useState<GenerationRow[]>([]);
  const [loaded, setLoaded]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<{ type?: string; userId?: string }, GenerationRow[]>(
        functions, 'hukumnamaAdminGetGenerations'
      );
      const res = await fn({
        type: typeFilter || undefined,
        userId: uidFilter.trim() || undefined,
      });
      setRows(res.data);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load generations.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, uidFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="poster">Poster</option>
          <option value="post-text">Post Text</option>
          <option value="reel">Reel</option>
          <option value="quote-card">Quote Card</option>
        </select>
        <input
          type="text"
          value={uidFilter}
          onChange={e => setUidFilter(e.target.value)}
          placeholder="Filter by user UID…"
          className="flex-1 min-w-40 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '…' : 'Load'}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loaded && (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Type</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Prompt</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Credits</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Date</th>
                <th className="px-4 py-3 font-semibold text-gray-600 text-xs"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No generations found.</td></tr>
              ) : rows.map(g => (
                <tr key={g.id} className="bg-white hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">{g.type || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">{truncate(g.prompt, 70)}</td>
                  <td className="px-4 py-3 font-medium text-gray-700">{g.creditsUsed ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(g.createdAt)}</td>
                  <td className="px-4 py-3">
                    {g.resultUrl && (
                      <a
                        href={g.resultUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        View ↗
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Moderation Tab ───────────────────────────────────────────────────────────

const ModerationTab: React.FC = () => {
  const [rows, setRows]       = useState<RefusalRow[]>([]);
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<{ limit?: number }, RefusalRow[]>(
        functions, 'hukumnamaAdminGetRefusals'
      );
      const res = await fn({ limit: 50 });
      setRows(res.data);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load refusals.');
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  // Auto-load on first render
  React.useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>;
  if (error)   return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Prompt</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Reason</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Severity</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Source</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">User</th>
            <th className="px-4 py-3 font-semibold text-gray-600 text-xs">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                No refusals yet ✅
              </td>
            </tr>
          ) : rows.map(r => (
            <tr key={r.id} className="bg-white hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-600 text-xs max-w-xs">{truncate(r.prompt, 70)}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{truncate(r.reason, 50)}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[r.severity ?? 'none'] ?? SEVERITY_COLORS['none']}`}>
                  {r.severity || 'none'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-400 text-xs">{r.source || '—'}</td>
              <td className="px-4 py-3 text-gray-400 text-xs font-mono">{truncate(r.userId, 12)}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(r.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Ad Stats Tab ─────────────────────────────────────────────────────────────

const AdStatsTab: React.FC = () => {
  const [stats, setStats]     = useState<AdStats | null>(null);
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    setError('');
    try {
      const fn = httpsCallable<{ days?: number }, AdStats>(
        functions, 'hukumnamaAdminGetAdStats'
      );
      const res = await fn({ days: 30 });
      setStats(res.data);
      setLoaded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ad stats.');
    } finally {
      setLoading(false);
    }
  }, [loaded]);

  React.useEffect(() => { void load(); }, [load]);

  if (loading) return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>;
  if (error)   return <p className="text-sm text-red-600">{error}</p>;
  if (!stats)  return null;

  const STAT_CARDS = [
    { label: 'Rewarded Completions', value: stats.rewardedCompletions, icon: '🏆', color: 'text-green-600 bg-green-50' },
    { label: 'Credits via Ads',      value: stats.creditsGranted,       icon: '⭐', color: 'text-saffron-600 bg-saffron-50' },
    { label: 'Banner Impressions',   value: stats.bannerImpressions,    icon: '📰', color: 'text-blue-600 bg-blue-50' },
    { label: 'Interstitial Views',   value: stats.interstitialImpressions, icon: '📺', color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Last 30 days</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {STAT_CARDS.map(({ label, value, icon, color }) => (
          <div key={label} className={`rounded-xl p-5 border border-gray-100 ${color.split(' ')[1]}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className={`text-2xl font-bold ${color.split(' ')[0]}`}>{value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main AdminPage ───────────────────────────────────────────────────────────

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'users',       label: 'Users',       icon: '👥' },
  { id: 'generations', label: 'Generations', icon: '🎨' },
  { id: 'moderation',  label: 'Moderation',  icon: '🛡️' },
  { id: 'adstats',     label: 'Ad Stats',    icon: '📊' },
];

const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<AdminTab>('users');

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back
        </button>
        <h2 className="text-2xl font-bold text-gray-900">🔧 Admin Dashboard</h2>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {tab === 'users'       && <UsersTab />}
        {tab === 'generations' && <GenerationsTab />}
        {tab === 'moderation'  && <ModerationTab />}
        {tab === 'adstats'     && <AdStatsTab />}
      </div>
    </div>
  );
};

export default AdminPage;
