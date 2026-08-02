import {
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './config';
import { createUserDocument } from './firestore';
import { track } from './analytics';

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  await createUserDocument(result.user);
  if (getAdditionalUserInfo(result)?.isNewUser) track('sign_up', { provider: 'google' });
  return result.user;
};

export const signInWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

export const registerWithEmail = async (email: string, password: string): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await createUserDocument(result.user);
  track('sign_up', { provider: 'email' });
  return result.user;
};

export const signOutUser = () => signOut(auth);

export const onAuthChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
