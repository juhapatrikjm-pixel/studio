'use client';

/**
 * @fileOverview Firebase-konfiguraatio.
 * 
 * TÄRKEÄÄ: Jos kirjautuminen ei toimi, varmista että Firebase-konsolissa:
 * 1. Google-kirjautuminen on aktivoitu (Authentication -> Sign-in method)
 * 2. Authorized domains sisältää sovelluksen URL-osoitteen.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyB-actual-api-key-from-studio-settings", 
  authDomain: "workhub-industrial.firebaseapp.com",
  projectId: "workhub-industrial",
  storageBucket: "workhub-industrial.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};