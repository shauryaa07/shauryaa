import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const isServer = typeof window === 'undefined';

const firebaseConfig = {
  apiKey: isServer ? process.env.VITE_FIREBASE_API_KEY : import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: isServer 
    ? `${process.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`
    : `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: isServer ? process.env.VITE_FIREBASE_PROJECT_ID : import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: isServer 
    ? `${process.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`
    : `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: isServer ? process.env.VITE_FIREBASE_APP_ID : import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
