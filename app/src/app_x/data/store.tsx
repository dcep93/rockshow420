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

interface Viewer {
  uid: string;
  username: string;
}
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
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    let generation = 0;
    let stopAdmin: (() => void) | undefined;
    const stopAuth = onIdTokenChanged(
      auth,
      (user) => {
        const current = ++generation;
        stopAdmin?.();
        setIsAdmin(false);
        setViewer(null);
        if (!user) {
          setReady(true);
          return;
        }
        void (async () => {
          try {
            const token = await user.getIdTokenResult();
            const email = user.email?.toLowerCase() ?? "";
            if (
              !user.emailVerified ||
              !/^[^@]+@gmail\.com$/.test(email) ||
              token.signInProvider !== "google.com"
            ) {
              if (current === generation) {
                setError("Please sign in with a verified Google Gmail account.");
                await firebaseSignOut(auth);
              }
              return;
            }
            if (current !== generation) return;
            const username = email.slice(0, -10);
            setViewer({ uid: user.uid, username });
            setReady(true);
            stopAdmin = onSnapshot(
              doc(db, "admins", user.uid),
              (snapshot) => {
                if (current === generation)
                  setIsAdmin(
                    email === "dcep93@gmail.com" &&
                      snapshot.data()?.enabled === true &&
                      snapshot.data()?.email === "dcep93@gmail.com",
                  );
              },
              () => {
                if (current === generation) setIsAdmin(false);
              },
            );
            await runTransaction(db, async (transaction) => {
              const ref = doc(db, "users", username);
              if (!(await transaction.get(ref)).exists())
                transaction.set(ref, {
                  user_id: user.uid,
                  username,
                });
            });
          } catch (failure) {
            if (current === generation) {
              setError(message(failure));
              setReady(true);
            }
          }
        })();
      },
      (failure) => {
        setError(message(failure));
        setReady(true);
      },
    );
    return () => {
      generation++;
      stopAdmin?.();
      stopAuth();
    };
  }, []);

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
