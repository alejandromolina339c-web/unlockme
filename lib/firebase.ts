// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // 👈 añadimos storage

// 👇 Usa aquí los mismos datos de firebaseConfig que copiaste de Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyD2iVOWu_WJXA2_OGb50dsmL5ytdFXo58s",
  authDomain: "mi-foto-75338.firebaseapp.com",
  projectId: "mi-foto-75338",
  storageBucket: "mi-foto-75338.firebasestorage.app",
  messagingSenderId: "433764508392",
  appId: "1:433764508392:web:2c46c230eddf279b075f5d"
};


// No cambies esto, solo la config de arriba
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // 👈 ahora sí exportamos storage
