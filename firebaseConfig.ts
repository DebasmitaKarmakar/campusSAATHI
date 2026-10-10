// firebaseConfig.ts
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDY4xhcr5oRyPPCgAhAVZjdnNXymFDYsq4",
  authDomain: "whisperthecampuslol.firebaseapp.com",
  projectId: "whisperthecampuslol",
  storageBucket: "whisperthecampuslol.firebasestorage.app",
  messagingSenderId: "391185290051",
  appId: "1:391185290051:web:d69b1370e0b9f24cf555f6",
  measurementId: "G-7DL23D9SYB"
};

// Prevent duplicate app initialization (hot-reload safe)
const app: FirebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;
