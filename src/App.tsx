import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GuestSessionProvider, useGuestSession } from '@/contexts/GuestSessionContext';
import { fetchHukumnamaWithGemini } from '@/services/geminiService';
import type { HukumnamaData } from '@/types';

import AuthPage            from '@/pages/AuthPage';
import ProfilePage         from '@/pages/ProfilePage';
import CreditsPage         from '@/pages/CreditsPage';
import CreationsPage       from '@/pages/CreationsPage';
import SettingsPage        from '@/pages/SettingsPage';
import ContentPolicyPage   from '@/pages/ContentPolicyPage';

import HukumnamaView      from '@/components/HukumnamaView';
import StatusGenerator    from '@/components/StatusGenerator';
import VideoGenerator     from '@/components/VideoGenerator';
import PostGenerator      from '@/components/PostGenerator';
import QuotePackGenerator from '@/components/QuotePackGenerator';
import TemplatesBrowser   from '@/components/TemplatesBrowser';
import VoiceCommand       from '@/components/VoiceCommand';
import Tabs               from '@/components/Tabs';
import Button             from '@/components/Button';
import BannerAd           from '@/components/BannerAd';
import InterstitialModal  from '@/components/InterstitialModal';

const INTERSTITIAL_EVERY = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

type Page = 'studio' | 'profile' | 'credits' | 'creations' | 'settings' | 'policy' | 'auth';

const STUDIO_TABS = [
  { id: 'hukumnama', label: 'Hukumnama', icon: '📜' },
  { id: 'templates', label: 'Templates', icon: '✨' },
  { id: 'voice',     label: 'Voice',      icon: '🎙️' },
  { id: 'post',      label: 'Posts',      icon: '✍️' },
  { id: 'quotes',    label: 'Quotes',     icon: '🌿' },
  { id: 'status',    label: 'Status',     icon: '🖼️' },
  { id: 'video',     label: 'Video',      icon: '🎥' },
];

const USER_MENU_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'profile',   label: 'Profile',       icon: '👤' },
  { page: 'credits',   label: 'Credits',        icon: '⭐' },
  { page: 'creations', label: 'My Creations',   icon: '🖼️' },
  { page: 'settings',  label: 'Settings',       icon: '⚙️' },
];

// ─── User avatar button + dropdown ───────────────────────────────────────────

const UserMenu: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => {
  const { userDoc } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (userDoc?.name || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full pl-2 pr-3 py-1 transition-colors"
      >
        {userDoc?.photoUrl ? (
          <img src={userDoc.photoUrl} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-saffron-500 flex items-center justify-center text-navy-900 text-xs font-bold">
            {initials}
          </div>
        )}
        <span className="text-white text-sm font-medium hidden sm:block max-w-25 truncate">
          {userDoc?.name || 'Account'}
        </span>
        <span className="text-white/70 text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-800 truncate">{userDoc?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate">{userDoc?.email}</p>
            <p className="text-xs text-saffron-600 font-semibold mt-0.5">{userDoc?.credits ?? 0} credits</p>
          </div>
          {USER_MENU_ITEMS.map(({ page, label, icon }) => (
            <button
              key={page}
              onClick={() => { onNavigate(page); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Guest header (shown instead of UserMenu when not signed in) ──────────────

const GuestHeader: React.FC<{ onNavigate: (page: Page) => void }> = ({ onNavigate }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => onNavigate('creations')}
      className="flex items-center justify-center w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
      title="My Creations"
    >
      <span className="text-sm">🖼️</span>
    </button>
    <button
      onClick={() => onNavigate('auth')}
      className="bg-saffron-500 hover:bg-saffron-600 text-navy-900 font-semibold text-xs px-4 py-1.5 rounded-full transition-colors"
    >
      Sign In
    </button>
  </div>
);

// ─── Main studio (content creation) ─────────────────────────────────────────

const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState('hukumnama');
  const [hukumnama, setHukumnama] = useState<HukumnamaData | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetchHukumnamaWithGemini()
      .then(setHukumnama)
      .catch(e => console.error('Failed to fetch hukumnama', e))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="overflow-x-auto pb-2">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={STUDIO_TABS} />
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'hukumnama' && (
          <div className="animate-fade-in-up">
            <HukumnamaView data={hukumnama} loading={loading} />
            {!loading && (
              <div className="mt-8 grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('post')}>
                  <h3 className="font-bold text-blue-900 mb-1">📝 Write Post</h3>
                  <p className="text-xs text-blue-700">Generate captions & hashtags</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('video')}>
                  <h3 className="font-bold text-purple-900 mb-1">🎥 Create Video</h3>
                  <p className="text-xs text-purple-700">Make Reels with Veo</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActiveTab('quotes')}>
                  <h3 className="font-bold text-green-900 mb-1">🌿 Get Quotes</h3>
                  <p className="text-xs text-green-700">Generate themed quote packs</p>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'templates' && <TemplatesBrowser />}
        {activeTab === 'voice'   && <VoiceCommand />}
        {activeTab === 'post'    && <PostGenerator hukumnama={hukumnama} />}
        {activeTab === 'quotes'  && <QuotePackGenerator />}
        {activeTab === 'status'  && <StatusGenerator hukumnama={hukumnama} />}
        {activeTab === 'video'   && <VideoGenerator hukumnama={hukumnama} />}
      </div>
    </>
  );
};

// ─── App shell ────────────────────────────────────────────────────────────────

const AppShell: React.FC = () => {
  const { user, userDoc, loading } = useAuth();
  const { guestCredits }           = useGuestSession();

  const [page, setPage]                         = useState<Page>('studio');
  const [showInterstitial, setShowInterstitial] = useState(false);
  const genCountRef                             = useRef(0);

  // Handle auth state transitions
  useEffect(() => {
    if (user && page === 'auth') setPage('studio');
    if (!user && (page === 'profile' || page === 'settings')) setPage('studio');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Interstitial counter
  useEffect(() => {
    const handler = () => {
      genCountRef.current += 1;
      if (genCountRef.current % INTERSTITIAL_EVERY === 0) setShowInterstitial(true);
    };
    window.addEventListener('generation-complete', handler);
    return () => window.removeEventListener('generation-complete', handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin" />
      </div>
    );
  }

  const goBack = () => setPage('studio');
  const displayCredits = user ? (userDoc?.credits ?? 0) : guestCredits;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {showInterstitial && (
        <InterstitialModal onClose={() => setShowInterstitial(false)} />
      )}

      <header className="bg-navy-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => setPage('studio')}
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <div className="w-9 h-9 bg-saffron-500 rounded-full flex items-center justify-center text-navy-900 font-bold text-lg shadow-inner">
              ੴ
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold leading-tight">Hukumnama Studio</h1>
              <p className="text-xs text-saffron-200">AI Powered • Gemini 2.5</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            {page === 'studio' && (
              <Button
                variant="primary"
                className="hidden sm:flex text-xs py-1 px-3"
                onClick={() => window.location.reload()}
              >
                Refresh
              </Button>
            )}
            <button
              onClick={() => setPage('credits')}
              className="flex items-center gap-1 bg-saffron-500/20 hover:bg-saffron-500/30 rounded-full px-3 py-1 transition-colors"
              title="Credits"
            >
              <span className="text-saffron-300 text-xs">⭐</span>
              <span className="text-white text-xs font-bold">{displayCredits}</span>
            </button>
            {user ? (
              <UserMenu onNavigate={setPage} />
            ) : (
              <GuestHeader onNavigate={setPage} />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {page === 'studio' && (
          <>
            <Studio />
            <div className="mt-8">
              <BannerAd slot="studio-bottom" format="horizontal" />
            </div>
          </>
        )}
        {page === 'auth'      && <AuthPage onBack={goBack} />}
        {page === 'profile'   && <ProfilePage       onBack={goBack} />}
        {page === 'credits'   && <CreditsPage        onBack={goBack} onSignIn={() => setPage('auth')} />}
        {page === 'creations' && (
          <>
            <CreationsPage onBack={goBack} />
            <div className="mt-4 mb-8">
              <BannerAd slot="creations-bottom" format="horizontal" />
            </div>
          </>
        )}
        {page === 'settings'  && <SettingsPage      onBack={goBack} />}
        {page === 'policy'    && <ContentPolicyPage onBack={goBack} />}
      </main>

      <footer className="text-center text-gray-400 text-sm py-8">
        <p>© {new Date().getFullYear()} Hukumnama AI Studio. Powered by Google Gemini.</p>
        <p className="text-xs mt-1 opacity-50">AI-generated content should be verified for accuracy.</p>
        <button
          onClick={() => setPage('policy')}
          className="text-xs mt-2 text-saffron-500 hover:text-saffron-600 underline underline-offset-2"
        >
          Content Policy
        </button>
      </footer>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <AuthProvider>
    <GuestSessionProvider>
      <AppShell />
    </GuestSessionProvider>
  </AuthProvider>
);

export default App;
