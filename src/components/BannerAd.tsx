import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logAdEvent } from '@/firebase/firestore';

interface BannerAdProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'rectangle';
  className?: string;
}

// Extend Window to allow adsbygoogle array (set by AdSense script)
declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const BannerAd: React.FC<BannerAdProps> = ({ slot, format = 'auto', className = '' }) => {
  const { user } = useAuth();
  const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;
  const pushed = useRef(false);

  useEffect(() => {
    if (!clientId || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({} as unknown);
    } catch {
      // AdSense not loaded yet — harmless
    }
    if (user) {
      logAdEvent(user.uid, 'impression', 'banner').catch(() => {});
    }
  }, [clientId, user]);

  if (!clientId) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl py-4 text-gray-300 text-xs gap-2 ${className}`}>
        <span>📢</span>
        <span>Ad — set <code className="font-mono text-gray-400">VITE_ADSENSE_CLIENT_ID</code> to activate</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default BannerAd;
