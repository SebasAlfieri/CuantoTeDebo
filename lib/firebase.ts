import { getApp, getApps, initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore/lite';

// Configuración pública del SDK web (no es un secreto). Se lee de .env.local.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let db: Firestore | null = null;

// Inicialización perezosa: solo se crea la app cuando una sala la necesita.
export const getDb = (): Firestore => {
  if (db) return db;

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Falta la configuración de Firebase (NEXT_PUBLIC_FIREBASE_*).');
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  return db;
};
