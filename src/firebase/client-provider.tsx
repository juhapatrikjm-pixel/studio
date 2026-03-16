'use client';

import React, { useMemo } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './index';

/**
 * Client-puolen kääre, joka alustaa Firebasen kerran ja tarjoaa sen koko sovellukselle.
 */
export function FirebaseClientProvider({ 
  children, 
}: { 
  children: React.ReactNode;
}) {
  // Alustetaan Firebase asiakaspuolella kerran useMemolla
  const services = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider 
      firebaseApp={services.firebaseApp} 
      firestore={services.firestore} 
      auth={services.auth}
      storage={services.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
