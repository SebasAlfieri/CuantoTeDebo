import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Solo para código de servidor (la limpieza automática). Usa una cuenta de servicio:
// FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY son secretos y nunca llevan el prefijo NEXT_PUBLIC_.
let db: Firestore | null = null;

export const getAdminDb = (): Firestore => {
  if (db) return db;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // En el panel de Vercel los saltos de línea de la clave suelen quedar como "\n" literales.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  // Con el emulador (FIRESTORE_EMULATOR_HOST) no hacen falta credenciales.
  const useEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (!projectId || (!useEmulator && (!clientEmail || !privateKey))) {
    throw new Error(
      'Falta la configuración del Admin SDK (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).'
    );
  }

  const app =
    getApps().length > 0
      ? getApp()
      : initializeApp(
          useEmulator
            ? { projectId }
            : { projectId, credential: cert({ projectId, clientEmail, privateKey }) }
        );

  db = getFirestore(app);
  return db;
};
