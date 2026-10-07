import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { collection, doc, onSnapshot, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import {
  emptyCatalog,
  normalizeArtist,
  normalizeConcert,
  normalizeFestival,
  normalizeLog,
  normalizeProfile,
  normalizeVenue,
} from "./model";
import type { Catalog } from "./model";
import { observeSession, pendingSession } from "./session";
import type { Viewer } from "./session";

interface AppState {
  catalog: Catalog;
  viewer: Viewer | null;
  isAdmin: boolean;
  ready: boolean;
  loading: boolean;
  error: string;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}
const AppContext = createContext<AppState | null>(null);
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Unable to connect. Please try again.";

export function AppProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog>(emptyCatalog);
  const [{ viewer, isAdmin, ready }, setSession] = useState(pendingSession);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const pending = new Set(["venues", "artists", "concerts", "festivals", "profiles", "logs"]);
    const settle = (key: string) => {
      pending.delete(key);
      setLoading(pending.size > 0);
    };
    const subscribe = <K extends keyof Catalog>(
      key: K,
      name: string,
      normalize: (id: string, value: Record<string, unknown>) => Catalog[K][number],
    ) =>
      onSnapshot(
        collection(db, name),
        (snapshot) => {
          setCatalog((previous) => ({
            ...previous,
            [key]: snapshot.docs.map((item) => normalize(item.id, item.data())),
          }));
          settle(key);
        },
        (failure) => {
          setError(message(failure));
          settle(key);
        },
      );
    const unsubscribe = [
      subscribe("venues", "venues", normalizeVenue),
      subscribe("artists", "artists", normalizeArtist),
      subscribe("concerts", "concerts", normalizeConcert),
      subscribe("festivals", "festivals", normalizeFestival),
      subscribe("profiles", "users", normalizeProfile),
      subscribe("logs", "user_concerts", normalizeLog),
    ];
    return () => unsubscribe.forEach((stop) => stop());
  }, []);

  useEffect(() => observeSession({
    watchUser: (next, error) => onIdTokenChanged(auth, next, error),
    watchAdmin: (uid, next, error) => onSnapshot(
      doc(db, "admins", uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        // Do not briefly show non-admin controls before the server answers.
        if (snapshot.metadata.fromCache) return;
        next(snapshot.data()?.enabled === true && snapshot.data()?.email === "dcep93@gmail.com");
      },
      error,
    ),
    ensureProfile: async ({ uid, username }) => {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "users", username);
        if (!(await transaction.get(ref)).exists()) transaction.set(ref, { user_id: uid, username });
      });
    },
    signOut: () => firebaseSignOut(auth),
  }, setSession, (failure) => setError(message(failure))), []);

  async function signIn() {
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
    } catch (failure) {
      setError(message(failure));
      throw failure;
    }
  }
  async function signOut() {
    await firebaseSignOut(auth);
  }
  return (
    <AppContext.Provider value={{ catalog, viewer, isAdmin, ready, loading, error, signIn, signOut }}>
      {children}
    </AppContext.Provider>
  );
}

// The provider and its hook intentionally live together as the public data API.
// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used within AppProvider.");
  return value;
}
