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
