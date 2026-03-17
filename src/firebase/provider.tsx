'use client';

import React, { createContext, useContext } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { FirebaseStorage } from 'firebase/storage';

interface FirebaseContextType {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  firebaseApp: null,
  firestore: null,
  auth: null,
  storage: null,
});

/**
 * Tarjoaa Firebase-palvelut koko sovellukselle.
 * Sallii null-arvot SSR-vaiheen aikana vikasietoisuuden parantamiseksi.
 */
export function FirebaseProvider({ 
  children, 
  firebaseApp, 
  firestore, 
  auth,
  storage
}: { 
  children: React.ReactNode;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}) {
  return (
    <FirebaseContext.Provider value={{ firebaseApp, firestore, auth, storage }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => useContext(FirebaseContext);
export const useFirebaseApp = () => useContext(FirebaseContext).firebaseApp;
export const useFirestore = () => useContext(FirebaseContext).firestore;
export const useAuth = () => useContext(FirebaseContext).auth;
export const useStorage = () => useContext(FirebaseContext).storage;
