'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export type FirebaseServices = {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
};

// Singleton-välimuisti palveluille
let cachedServices: FirebaseServices | null = null;

/**
 * Alustaa Firebase-palvelut vikasietoisesti.
 * Estää "Internal Server Error" -virheet Next.js SSR-vaiheessa.
 */
export function initializeFirebase(): FirebaseServices {
  // 1. Palautetaan välimuistista jos löytyy (Singleton)
  if (cachedServices) return cachedServices;

  // 2. Alustetaan perus-App (estetään moninkertainen alustus)
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // 3. Palvelinpuolen (SSR) suojaus: Palautetaan vain App, ei alusteta raskaampia palveluita palvelimella
  if (typeof window === 'undefined') {
    return {
      firebaseApp,
      firestore: null,
      auth: null,
      storage: null
    };
  }

  // 4. Asiakaspuolen alustus (wisemisa-tietokanta ja määritetty storage)
  try {
    const firestore = getFirestore(firebaseApp, "wisemisa");
    const auth = getAuth(firebaseApp);
    const storage = getStorage(firebaseApp, "gs://wisemisa-d2b98.firebasestorage.app");

    cachedServices = { firebaseApp, firestore, auth, storage };
    return cachedServices;
  } catch (error) {
    console.error("Firebase initialization failed during runtime:", error);
    return { firebaseApp, firestore: null, auth: null, storage: null };
  }
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
