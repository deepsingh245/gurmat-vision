import React, { useEffect, useState } from 'react';
import BannerAd from './BannerAd';
import { useAuth } from '@/contexts/AuthContext';
import { logAdEvent } from '@/firebase/firestore';

interface InterstitialModalProps {
  onClose: () => void;
}

const CLOSE_DELAY = 5; // seconds before X becomes active

const InterstitialModal: React.FC<InterstitialModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(CLOSE_DELAY);

  // Log impression once
  useEffect(() => {
    if (user) {
      logAdEvent(user.uid, 'impression', 'interstitial').catch(() => {});
    }
  }, [user]);

  // Countdown to enable close button
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={countdown <= 0 ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-navy-900 text-white">
          <span className="text-sm font-semibold text-white/80">Sponsored</span>
          {countdown > 0 ? (
            <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 tabular-nums">
              {countdown}s
            </span>
          ) : (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close ad"
            >
              ×
            </button>
          )}
        </div>

        {/* Ad unit */}
        <div className="p-4">
          <BannerAd slot="interstitial-between-gens" format="rectangle" />
        </div>

        {/* Footer CTA */}
        <div className="px-4 pb-4 text-center">
          {countdown > 0 ? (
            <p className="text-gray-400 text-xs">
              Ad closes in {countdown}s — thanks for supporting Hukumnama AI
            </p>
          ) : (
            <button
              onClick={onClose}
              className="w-full bg-saffron-500 hover:bg-saffron-600 text-navy-900 font-semibold text-sm py-2.5 rounded-xl transition-colors"
            >
              Continue Creating
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterstitialModal;
