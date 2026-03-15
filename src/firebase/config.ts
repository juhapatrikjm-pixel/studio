'use client';

/**
 * @fileOverview Firebase-konfiguraatio.
 * 
 * NÄIN SAAT OIKEAN API-AVAIMEN:
 * 1. Mene osoitteeseen: https://console.firebase.google.com
 * 2. Valitse projektisi: workhub-industrial
 * 3. Klikkaa ratas-ikonia -> Project Settings
 * 4. Kopioi "Web API Key" ja sijoita se alla olevaan 'apiKey' kenttään.
 */

export const firebaseConfig = {
  // KORVAA TÄMÄ FIREBASE-KONSOLISTA SAATAVALLA AVAIMELLA
  apiKey: "AIzaSyB-actual-api-key-from-your-project-settings", 
  authDomain: "workhub-industrial.firebaseapp.com",
  projectId: "workhub-industrial",
  storageBucket: "workhub-industrial.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
