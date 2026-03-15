'use client';

/**
 * @fileOverview Firebase-konfiguraatio.
 * 
 * TÄRKEÄÄ: API-avain on projektikohtainen.
 * Jos saat "api-key-not-valid" virheen:
 * 1. Mene Firebase Consoleen (https://console.firebase.google.com)
 * 2. Valitse oikea projekti
 * 3. Ratas-ikoni -> Project Settings
 * 4. Kopioi "Web API Key" tähän.
 */

export const firebaseConfig = {
  apiKey: "AIzaSyB-actual-api-key-from-your-project-settings", 
  authDomain: "workhub-industrial.firebaseapp.com",
  projectId: "workhub-industrial",
  storageBucket: "workhub-industrial.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
