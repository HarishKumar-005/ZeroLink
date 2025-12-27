'use client';

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - these values should be set as environment variables
// in production. For now, we use placeholders that will fail gracefully if not configured.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

// Check if Firebase is properly configured
const isFirebaseConfigured = Object.values(firebaseConfig).every(val => val !== "");

// Initialize Firebase only if properly configured
let app;
let db;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log('[Firebase] Initialized successfully');
  } catch (error) {
    console.warn('[Firebase] Initialization failed:', error);
    app = undefined;
    db = undefined;
  }
} else {
  console.warn('[Firebase] Not configured - using local storage only. Set NEXT_PUBLIC_FIREBASE_* environment variables to enable cloud sync.');
  app = undefined;
  db = undefined;
}

export { app, db };
