import React, { createContext, useContext, useState } from 'react';
import type { Generation } from '@/types';

const CREDITS_KEY = 'hukumnama-guest-credits';
const INITIAL_CREDITS = 5;

function readStoredCredits(): number {
  const raw = localStorage.getItem(CREDITS_KEY);
  if (raw === null) {
    localStorage.setItem(CREDITS_KEY, String(INITIAL_CREDITS));
    return INITIAL_CREDITS;
  }
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, n) : INITIAL_CREDITS;
}

interface GuestSessionContextValue {
  guestCredits: number;
  guestGenerations: Generation[];
  spendGuestCredits: (amount: number) => void;
  refundGuestCredits: (amount: number) => void;
  addGuestGeneration: (gen: Pick<Generation, 'type' | 'prompt' | 'resultUrl' | 'creditsUsed'>) => void;
  removeGuestGeneration: (id: string) => void;
}

const GuestSessionContext = createContext<GuestSessionContextValue | null>(null);

export const GuestSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [guestCredits, setGuestCredits] = useState<number>(() => readStoredCredits());
  const [guestGenerations, setGuestGenerations] = useState<Generation[]>([]);

  const spendGuestCredits = (amount: number) => {
    setGuestCredits(prev => {
      if (prev < amount) throw new Error('Insufficient credits');
      const next = prev - amount;
      localStorage.setItem(CREDITS_KEY, String(next));
      return next;
    });
  };

  const refundGuestCredits = (amount: number) => {
    setGuestCredits(prev => {
      const next = prev + amount;
      localStorage.setItem(CREDITS_KEY, String(next));
      return next;
    });
  };

  const addGuestGeneration = (
    gen: Pick<Generation, 'type' | 'prompt' | 'resultUrl' | 'creditsUsed'>,
  ) => {
    const newItem: Generation = {
      ...gen,
      id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: 'guest',
      createdAt: new Date().toISOString(),
      deleted: false,
    };
    setGuestGenerations(prev => [newItem, ...prev]);
  };

  const removeGuestGeneration = (id: string) => {
    setGuestGenerations(prev => prev.filter(g => g.id !== id));
  };

  return (
    <GuestSessionContext.Provider value={{
      guestCredits,
      guestGenerations,
      spendGuestCredits,
      refundGuestCredits,
      addGuestGeneration,
      removeGuestGeneration,
    }}>
      {children}
    </GuestSessionContext.Provider>
  );
};

export const useGuestSession = (): GuestSessionContextValue => {
  const ctx = useContext(GuestSessionContext);
  if (!ctx) throw new Error('useGuestSession must be inside GuestSessionProvider');
  return ctx;
};
