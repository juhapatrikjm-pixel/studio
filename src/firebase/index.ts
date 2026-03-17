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

// Singleton cache for services
let cachedServices: FirebaseServices | null = null;

/**
 * Initializes Firebase services with SSR protection and singleton pattern.
 * Uses the named "wisemisa" database and specific storage bucket.
 */
export function initializeFirebase(): FirebaseServices {
  // 1. Return from cache if available (Singleton)
  if (cachedServices) return cachedServices;

  // 2. Initialize App (prevent duplicate initialization)
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

  // 3. Server-side (SSR) safety: return only App, do not init heavier services on server
  if (typeof window === 'undefined') {
    return {
      firebaseApp,
      firestore: null,
      auth: null,
      storage: null
    };
  }

  // 4. Client-side initialization (wisemisa database and specified storage)
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
