import { useAuth } from '@/contexts/AuthContext';
import { deductCredits, refundCredits } from '@/firebase/firestore';

interface UseCreditsReturn {
  credits: number;
  canAfford: (cost: number) => boolean;
  spend: (cost: number) => Promise<void>;
  refund: (cost: number) => Promise<void>;
}

export const useCredits = (): UseCreditsReturn => {
  const { user, userDoc, refreshUserDoc } = useAuth();

  const credits = userDoc?.credits ?? 0;

  const canAfford = (cost: number) => credits >= cost;

  const spend = async (cost: number): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    await deductCredits(user.uid, cost);
    await refreshUserDoc();
  };

  const refund = async (cost: number): Promise<void> => {
    if (!user) return;
    await refundCredits(user.uid, cost).catch(() => {});
    await refreshUserDoc();
  };

  return { credits, canAfford, spend, refund };
};
