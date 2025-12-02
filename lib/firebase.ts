// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// ⚠ Usa exactamente estos datos, son los de tu proyecto mi-foto-75338
const firebaseConfig = {
  apiKey: "AIzaSyD2iVOWu_WJXA2_OGb50dsmL5ytdFXo58s",
  authDomain: "mi-foto-75338.firebaseapp.com",
  projectId: "mi-foto-75338",
  storageBucket: "mi-foto-75338.firebasestorage.app", // <- así lo da Firebase ahora
  messagingSenderId: "433764508392",
  appId: "1:433764508392:web:2c46c230eddf279b075f5d",
};

// Evitar inicializar Firebase dos veces en desarrollo
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
