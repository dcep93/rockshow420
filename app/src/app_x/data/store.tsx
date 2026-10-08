import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  GoogleAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { auth, db } from "./firebase";
import { record, tableNames, transactionTables, watchTables } from "./tables";
import {
  emptyCatalog,
  normalizeArtist,
  normalizeConcert,
  normalizeSchedule,
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
  const [tableError, setTableError] = useState("");

  useEffect(() => {
    const pending = new Set<string>(tableNames);
    const failures = new Map<string, string>();
    const mappings = {
      venues: ["venues", normalizeVenue], artists: ["artists", normalizeArtist],
      concerts: ["concerts", normalizeConcert], schedules: ["schedules", normalizeSchedule],
      users: ["profiles", normalizeProfile], user_concerts: ["logs", normalizeLog],
    } as const;
    return watchTables(db, (name, records) => {
      const [key, normalize] = mappings[name];
      setCatalog(previous => ({ ...previous, [key]: Object.entries(records).map(([id, data]) => normalize(id, data)) }));
      pending.delete(name);
      failures.delete(name);
      setTableError(failures.values().next().value || "");
      setLoading(pending.size > 0);
    }, (name, failure) => {
      // A failed table must not be presented as an empty, fully loaded catalog.
      failures.set(name, message(failure));
      setTableError(message(failure));
    });
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
        const tables = transactionTables(db, transaction);
        if (!record(await tables.read("users"), username)) tables.put("users", username, { user_id: uid, username });
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
    <AppContext.Provider value={{ catalog, viewer, isAdmin, ready, loading, error: error || tableError, signIn, signOut }}>
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
