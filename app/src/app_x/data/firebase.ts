import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

export const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";
const app = initializeApp({
  apiKey: "AIzaSyAjl7fvIu3JXwoRSb36K4FNNdQMYxA-6Q4",
  authDomain: "rockshow420.firebaseapp.com",
  messagingSenderId: "571235844591",
  projectId: useEmulators ? "demo-rockshow420" : "rockshow420",
  storageBucket: "rockshow420.firebasestorage.app",
});
export const auth = getAuth(app);
export const db = getFirestore(app);
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
