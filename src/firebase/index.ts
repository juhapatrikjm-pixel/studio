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

// Singleton-instanssi estämään useampi alustusyritys, mikä aiheuttaa
// "Firestore INTERNAL ASSERTION FAILED: Unexpected state" -virheitä Next.js:ssä
let cachedServices: FirebaseServices | null = null;

/**
 * Alustaa Firebase-palvelut keskitetysti.
 * Käyttää nimettyä tietokantaa "wisemisa" ja määritettyä Storage-bucketia.
 */
export function initializeFirebase(): FirebaseServices {
  // Palautetaan aiemmin alustetut palvelut, jos ne ovat jo olemassa (asiakaspuolella)
  if (typeof window !== 'undefined' && cachedServices) {
    return cachedServices;
  }

  const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  
  // Varmistetaan ympäristömuuttujien latautuminen
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.warn("DEBUG: Firebase API Key puuttuu ympäristömuuttujista!");
  }

  // Alustetaan palvelut käyttäen pyydettyä nimettyä tietokantaa ja storage-bucketia
  const firestore = getFirestore(firebaseApp, "wisemisa");
  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp, "gs://wisemisa-d2b98.firebasestorage.app");

  cachedServices = { firebaseApp, firestore, auth, storage };
  return cachedServices;
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
