import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChanged } from '@/firebase/auth';
import { getUserDocument, grantDailyBonus } from '@/firebase/firestore';
import type { UserDocument } from '@/types';

interface AuthContextValue {
  user: User | null;
  userDoc: UserDocument | null;
  loading: boolean;
  refreshUserDoc: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserDoc = async () => {
    if (!user) return;
    const doc = await getUserDocument(user.uid);
    setUserDoc(doc);
  };

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const doc = await getUserDocument(firebaseUser.uid);
        setUserDoc(doc);
        // Grant daily +2 bonus silently on app open
        await grantDailyBonus(firebaseUser.uid);
        // Refresh to reflect the bonus if it was granted
        const fresh = await getUserDocument(firebaseUser.uid);
        setUserDoc(fresh);
      } else {
        setUserDoc(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
};
