import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA6opnmjv0SeF25LZcSL7pae9qRfrElIGM",
  authDomain: "staytrack1.firebaseapp.com",
  projectId: "staytrack1",
  storageBucket: "staytrack1.firebasestorage.app",
  messagingSenderId: "1082209245912",
  appId: "1:1082209245912:web:fa30bed366c377099c95ad",
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

let auth: Auth;
try {
  auth = getAuth(app);
} catch {
  const fallbackApp = getApps().find((a) => a.name === "fallback") || initializeApp(DEFAULT_FIREBASE_CONFIG, "fallback");
  auth = getAuth(fallbackApp);
}

let db: Firestore;
try {
  db = getFirestore(app);
} catch {
  const fallbackApp = getApps().find((a) => a.name === "fallback") || initializeApp(DEFAULT_FIREBASE_CONFIG, "fallback");
  db = getFirestore(fallbackApp);
}

let storage: FirebaseStorage;
try {
  storage = getStorage(app);
} catch {
  const fallbackApp = getApps().find((a) => a.name === "fallback") || initializeApp(DEFAULT_FIREBASE_CONFIG, "fallback");
  storage = getStorage(fallbackApp);
}

export { auth, db, storage };
export default app;
