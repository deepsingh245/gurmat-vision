import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { grantDailyBonus } from '@/firebase/firestore';
import Button from '@/components/Button';
import WatchAdButton from '@/components/WatchAdButton';

interface CreditsPageProps {
  onBack: () => void;
  onSignIn?: () => void;
}

const GENERATION_COSTS = [
  { type: 'Image',      cost: 1,  icon: '🎨' },
  { type: 'Quote Card', cost: 1,  icon: '🌿' },
  { type: 'Video',      cost: 10, icon: '🎬' },
];

const CostTable: React.FC = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
    <h3 className="font-bold text-gray-800 mb-4">Credit Costs</h3>
    <div className="space-y-3">
      {GENERATION_COSTS.map(({ type, cost, icon }) => (
        <div key={type} className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <span>{icon}</span>
            <span>{type}</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">{cost} credit{cost > 1 ? 's' : ''}</span>
        </div>
      ))}
    </div>
  </div>
);

const CreditsPage: React.FC<CreditsPageProps> = ({ onBack, onSignIn }) => {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { guestCredits }                  = useGuestSession();
  const [claiming, setClaiming]           = useState(false);
  const [claimMsg, setClaimMsg]           = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const dailyClaimed = userDoc?.lastDailyBonus === today;

  // ─── Guest view ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
          ← Back
        </button>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Credits & Usage</h2>

        <div className="bg-linear-to-r from-saffron-500 to-saffron-600 rounded-2xl p-6 text-white mb-6 shadow-md">
          <p className="text-sm opacity-80 mb-1">Session Credits</p>
          <p className="text-5xl font-bold">{guestCredits}</p>
          <p className="text-xs opacity-70 mt-2">Sign in to get permanent credits that never expire</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="font-bold text-gray-800 mb-2">Get 10 Free Credits</h3>
          <p className="text-sm text-gray-500 mb-4">
            Create a free account and receive 10 credits instantly, plus 2 more every day you open the app.
          </p>
          <Button onClick={onSignIn} className="w-full">
            Sign In / Create Account
          </Button>
        </div>

        <CostTable />
      </div>
    );
  }

  // ─── Auth view ───────────────────────────────────────────────────────────────
  const handleClaimBonus = async () => {
    if (dailyClaimed) return;
    setClaiming(true);
    setClaimMsg(null);
    try {
      const granted = await grantDailyBonus(user.uid);
      await refreshUserDoc();
      setClaimMsg(granted ? '+2 credits added!' : 'Already claimed today.');
    } catch {
      setClaimMsg('Failed to claim. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
        ← Back
      </button>

      <h2 className="text-xl font-bold text-gray-900 mb-6">Credits & Usage</h2>

      <div className="bg-linear-to-r from-saffron-500 to-saffron-600 rounded-2xl p-6 text-white mb-6 shadow-md">
        <p className="text-sm opacity-80 mb-1">Available Credits</p>
        <p className="text-5xl font-bold">{userDoc?.credits ?? 0}</p>
        <p className="text-xs opacity-70 mt-2">Credits never expire</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
        <h3 className="font-bold text-gray-800">Earn Credits</h3>

        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
          <div>
            <p className="font-semibold text-green-800 text-sm">Daily Bonus</p>
            <p className="text-xs text-green-600">+2 credits every day you open the app</p>
          </div>
          <Button
            onClick={handleClaimBonus}
            isLoading={claiming}
            disabled={dailyClaimed}
            className="text-xs py-1.5 px-3"
          >
            {dailyClaimed ? '✓ Claimed' : 'Claim +2'}
          </Button>
        </div>
        {claimMsg && (
          <p className="text-sm text-center text-green-700">{claimMsg}</p>
        )}

        <WatchAdButton onSuccess={() => setClaimMsg(null)} />
      </div>

      <CostTable />
    </div>
  );
};

export default CreditsPage;
