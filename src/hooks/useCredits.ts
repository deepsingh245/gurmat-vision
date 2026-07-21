import { useAuth } from '@/contexts/AuthContext';
import { useGuestSession } from '@/contexts/GuestSessionContext';
import { deductCredits, refundCredits } from '@/firebase/firestore';

interface UseCreditsReturn {
  credits: number;
  canAfford: (cost: number) => boolean;
  spend: (cost: number) => Promise<void>;
  refund: (cost: number) => Promise<void>;
}

export const useCredits = (): UseCreditsReturn => {
  const { user, userDoc, refreshUserDoc } = useAuth();
  const { guestCredits, spendGuestCredits, refundGuestCredits } = useGuestSession();

  const credits = user ? (userDoc?.credits ?? 0) : guestCredits;

  const canAfford = (cost: number) => credits >= cost;

  const spend = async (cost: number): Promise<void> => {
    if (!user) {
      spendGuestCredits(cost);
      return;
    }
    await deductCredits(user.uid, cost);
    await refreshUserDoc();
  };

  const refund = async (cost: number): Promise<void> => {
    if (!user) {
      refundGuestCredits(cost);
      return;
    }
    await refundCredits(user.uid, cost).catch(() => {});
    await refreshUserDoc();
  };

  return { credits, canAfford, spend, refund };
};
