import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6opnmjv0SeF25LZcSL7pae9qRfrElIGM",
  authDomain: "staytrack1.firebaseapp.com",
  projectId: "staytrack1",
  storageBucket: "staytrack1.firebasestorage.app",
  messagingSenderId: "1082209245912",
  appId: "1:1082209245912:web:fa30bed366c377099c95ad",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
