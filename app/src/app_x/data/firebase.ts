import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";
const app = initializeApp({
  apiKey: "AIzaSyBalhxRswpygQyNYPjqam9dzNuq54pU6FI",
  authDomain: "concertboxd.firebaseapp.com",
  messagingSenderId: "565493109366",
  projectId: useEmulators ? "demo-concertboxd" : "concertboxd",
  appId: "1:565493109366:web:99dab1081e995c4f844557",
  storageBucket: "concertboxd.firebasestorage.app",
});
export const auth = getAuth(app);
export const db = getFirestore(app);
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
