'use client';

/**
 * @fileOverview Firebase-konfiguraatio projektille: workhub-industrial
 * 
 * NÄIN SAAT SOVELLUKSEN LINKITETTYÄ:
 * 1. Mene Firebase Consoleen (https://console.firebase.google.com)
 * 2. Valitse projektisi: workhub-industrial
 * 3. Klikkaa ratas-ikonia -> Project Settings
 * 4. Kopioi "Web API Key" ja liitä se alla olevaan 'apiKey' kenttään.
 * 
 * Jos projektia ei ole vielä luotu Firebaseen, sovellus toimii 'Demo-tilassa'.
 */

export const firebaseConfig = {
  // TÄRKEÄÄ: Kopioi tähän API-avain Firebase-konsolista
  apiKey: "AIzaSyB-varmista-api-avain-firebase-konsolista", 
  authDomain: "workhub-industrial.firebaseapp.com",
  projectId: "workhub-industrial",
  storageBucket: "workhub-industrial.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
