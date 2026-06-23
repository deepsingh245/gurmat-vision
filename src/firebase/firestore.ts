import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './config';
import type { UserDocument, Generation, GenerationType } from '@/types';

// ─── Users ────────────────────────────────────────────────────────────────────

export const createUserDocument = async (user: User): Promise<void> => {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    uid:            user.uid,
    name:           user.displayName || '',
    email:          user.email || '',
    photoUrl:       user.photoURL || '',
    plan:           'free',
    credits:        10,
    lastDailyBonus: null,
    createdAt:      serverTimestamp(),
  });
};

export const getUserDocument = async (uid: string): Promise<UserDocument | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserDocument) : null;
};

export const updateUserDocument = async (uid: string, data: Partial<UserDocument>): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), data as Record<string, unknown>);
};

// ─── Credits ──────────────────────────────────────────────────────────────────

export const deductCredits = async (uid: string, amount: number): Promise<void> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('User not found');

  const current = (snap.data() as UserDocument).credits;
  if (current < amount) throw new Error('Insufficient credits');

  await updateDoc(ref, { credits: current - amount });
};

export const grantDailyBonus = async (uid: string): Promise<boolean> => {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return false;

  const user = snap.data() as UserDocument;
  const today = new Date().toISOString().split('T')[0];
  if (user.lastDailyBonus === today) return false;

  await updateDoc(ref, {
    credits: user.credits + 2,
    lastDailyBonus: today,
  });
  return true;
};

// ─── Generations ──────────────────────────────────────────────────────────────

export const saveGeneration = async (
  userId: string,
  type: GenerationType,
  prompt: string,
  resultUrl: string,
  creditsUsed: number,
): Promise<string> => {
  const ref = await addDoc(collection(db, 'generations'), {
    userId,
    type,
    prompt,
    resultUrl,
    creditsUsed,
    deleted: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const getUserGenerations = async (
  userId: string,
  pageSize = 20,
): Promise<Generation[]> => {
  const q = query(
    collection(db, 'generations'),
    where('userId', '==', userId),
    where('deleted', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Generation));
};

export const softDeleteGeneration = async (generationId: string): Promise<void> => {
  await updateDoc(doc(db, 'generations', generationId), { deleted: true });
};
