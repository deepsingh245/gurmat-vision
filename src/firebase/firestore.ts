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
  startAfter,
  runTransaction,
  serverTimestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
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
    language:       'english',
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
  await runTransaction(db, async (tx) => {
    const ref  = doc(db, 'users', uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('User not found');
    const current = (snap.data() as UserDocument).credits;
    if (current < amount) throw new Error('Insufficient credits');
    tx.update(ref, { credits: current - amount });
  });
};

export const refundCredits = async (uid: string, amount: number): Promise<void> => {
  await runTransaction(db, async (tx) => {
    const ref  = doc(db, 'users', uid);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const current = (snap.data() as UserDocument).credits;
    tx.update(ref, { credits: current + amount });
  });
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
  pageSize = 12,
  cursor?: QueryDocumentSnapshot<DocumentData>,
): Promise<{ items: Generation[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> => {
  const baseConstraints = [
    where('userId', '==', userId),
    where('deleted', '==', false),
    orderBy('createdAt', 'desc'),
  ];
  const q = query(
    collection(db, 'generations'),
    ...baseConstraints,
    ...(cursor ? [startAfter(cursor)] : []),
    limit(pageSize),
  );
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as Generation));
  const lastDoc = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { items, lastDoc };
};

export const softDeleteGeneration = async (generationId: string): Promise<void> => {
  await updateDoc(doc(db, 'generations', generationId), { deleted: true });
};
