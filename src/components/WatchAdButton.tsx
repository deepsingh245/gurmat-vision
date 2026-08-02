import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { track } from '@/firebase/analytics';

const AD_DURATION = 30;
const MAX_DAILY   = 3;

interface WatchAdButtonProps {
  onSuccess?: (creditsGranted: number) => void;
}

type State = 'idle' | 'watching' | 'claiming' | 'done' | 'limited' | 'error';

const WatchAdButton: React.FC<WatchAdButtonProps> = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { credits } = useCredits();

  const [state, setState]       = useState<State>('idle');
  const [countdown, setCountdown] = useState(AD_DURATION);
  const [errorMsg, setErrorMsg] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const rewardsToday = userDoc?.lastAdReward === today ? (userDoc?.adRewardsToday ?? 0) : 0;
  const remaining = MAX_DAILY - rewardsToday;

  useEffect(() => {
    if (state !== 'watching') return;
    if (countdown <= 0) { handleClaimReward(); return; }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  });

  const handleClaimReward = useCallback(async () => {
    setState('claiming');
    try {
      const fn = httpsCallable<void, { creditsGranted: number }>(functions, 'hukumnamaGrantAdReward');
      const result = await fn();
      await refreshUserDoc();
      setState('done');
      track('ad_rewarded_done', { credits_granted: result.data.creditsGranted });
      onSuccess?.(result.data.creditsGranted);
      setTimeout(() => { setState('idle'); setCountdown(AD_DURATION); }, 3000);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? '';
      if (msg.includes('resource-exhausted') || msg.includes('Daily limit')) {
        setState('limited');
      } else {
        setErrorMsg(t('watchAd.error'));
        setState('error');
      }
    }
  }, [onSuccess, refreshUserDoc, t]);

  if (!user) return null;

  if (remaining <= 0 || state === 'limited') {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-amber-700 font-semibold text-sm">{t('watchAd.limitReached')}</p>
        <p className="text-amber-600 text-xs mt-1">
          {t('watchAd.limitDesc', { total: MAX_DAILY * 5 })}
        </p>
      </div>
    );
  }

  if (state === 'watching') {
    const progress = ((AD_DURATION - countdown) / AD_DURATION) * 100;
    return (
      <div className="bg-navy-900 rounded-2xl overflow-hidden">
        <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 aspect-video flex flex-col items-center justify-center text-white p-6 text-center">
          <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {t('watchAd.adCountdown', { seconds: countdown })}
          </div>
          <p className="text-4xl mb-3">🌟</p>
          <p className="text-lg font-bold">{t('watchAd.adTitle')}</p>
          <p className="text-saffron-300 text-sm mt-1">{t('watchAd.adSubtitle')}</p>
          <p className="text-white/50 text-xs mt-4">
            {countdown > 0 ? t('watchAd.watchFor', { seconds: countdown }) : t('watchAd.claiming')}
          </p>
        </div>

        <div className="h-1.5 bg-navy-700">
          <div
            className="h-full bg-saffron-400 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="p-4 text-center">
          <p className="text-white/70 text-xs">{t('watchAd.keepOpen')}</p>
        </div>
      </div>
    );
  }

  if (state === 'claiming') {
    return (
      <div className="bg-saffron-50 border border-saffron-200 rounded-xl p-6 text-center">
        <div className="w-8 h-8 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-saffron-700 font-semibold text-sm">{t('watchAd.crediting')}</p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <p className="text-3xl mb-2">✅</p>
        <p className="text-green-700 font-bold">{t('watchAd.success')}</p>
        <p className="text-green-600 text-sm mt-1">
          {t('watchAd.successBalance', { credits })}
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
        <p className="text-red-700 text-sm mb-3">{errorMsg}</p>
        <button
          onClick={() => { setState('idle'); setCountdown(AD_DURATION); }}
          className="text-xs text-red-600 underline"
        >
          {t('watchAd.tryAgain')}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { track('ad_rewarded_start', { ad_unit: 'rewarded' }); setState('watching'); }}
      className="w-full flex items-center justify-between bg-navy-900 hover:bg-navy-800 text-white rounded-2xl p-4 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-saffron-500 rounded-full flex items-center justify-center text-navy-900 text-lg shrink-0">
          ▶
        </div>
        <div className="text-left">
          <p className="font-bold text-sm">{t('watchAd.watchBtn')}</p>
          <p className="text-white/60 text-xs mt-0.5">
            {t('watchAd.watchBtnSub', { remaining, max: MAX_DAILY })}
          </p>
        </div>
      </div>
      <span className="text-saffron-400 text-xl group-hover:translate-x-1 transition-transform">→</span>
    </button>
  );
};

export default WatchAdButton;
