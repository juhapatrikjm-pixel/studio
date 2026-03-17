'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

export type FirebaseServices = {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
};

/**
 * Alustaa Firebase-palvelut Singleton-mallilla ympäristömuuttujia hyödyntäen.
 */
export function initializeFirebase(): FirebaseServices {
  // Tarkistetaan, onko Firebase jo alustettu
  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Debug-logit ympäristömuuttujien tarkistukseen
  console.log("DEBUG: Firebase API Key löytyi:", !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
  console.log("DEBUG: Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

  // Alustetaan palvelut
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp);

  return { firebaseApp, firestore, auth, storage };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
