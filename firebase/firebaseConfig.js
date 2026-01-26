import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBS0C9ujw7iU3w9ZJYOfWMwH6u7jHByE0c",
  authDomain: "sentrilock-9db8f.firebaseapp.com",
  projectId: "sentrilock-9db8f",
  storageBucket: "sentrilock-9db8f.firebasestorage.app",
  messagingSenderId: "715232745006",
  appId: "1:715232745006:web:d25afa781024303e5e31bf",
  measurementId: "G-TW27T7ZFEH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Always safe:
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Browser-only Analytics
let analytics = null;

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };

// --------------------
// Messaging (browser only)
// --------------------
let messaging = null;

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  messaging = getMessaging(app);
}

export { messaging };
