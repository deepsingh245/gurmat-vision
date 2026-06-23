import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

export const uploadGeneratedImage = async (userId: string, blob: Blob): Promise<string> => {
  const storageRef = ref(storage, `generated-images/${userId}/${Date.now()}.png`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};

export const uploadGeneratedVideo = async (userId: string, blob: Blob): Promise<string> => {
  const storageRef = ref(storage, `generated-videos/${userId}/${Date.now()}.mp4`);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
};

export const uploadUserAsset = async (userId: string, file: File): Promise<string> => {
  const storageRef = ref(storage, `user-assets/${userId}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
