import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthChanged } from '@/firebase/auth';
import { getUserDocument, createUserDocument, grantDailyBonus } from '@/firebase/firestore';
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
      try {
        if (firebaseUser) {
          let doc = await getUserDocument(firebaseUser.uid);
          if (!doc) {
            // Auth session exists but no Firestore doc — create it (e.g. first run after DB reset)
            await createUserDocument(firebaseUser);
            doc = await getUserDocument(firebaseUser.uid);
          }
          setUserDoc(doc);
          await grantDailyBonus(firebaseUser.uid);
          const fresh = await getUserDocument(firebaseUser.uid);
          setUserDoc(fresh);
        } else {
          setUserDoc(null);
        }
      } catch (e) {
        console.error('Failed to load user document', e);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userDoc, loading, refreshUserDoc }}>
      {children}
    </AuthContext.Provider>
  );
};
