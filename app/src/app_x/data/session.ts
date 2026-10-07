export interface Viewer {
  uid: string;
  username: string;
}
export interface Session {
  viewer: Viewer | null;
  isAdmin: boolean;
  ready: boolean;
}
export const pendingSession: Session = { viewer: null, isAdmin: false, ready: false };
interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  getIdTokenResult(): Promise<{ signInProvider: string | null }>;
}
interface SessionSource {
  watchUser(next: (user: AuthUser | null) => void, error: (error: unknown) => void): () => void;
  watchAdmin(uid: string, next: (enabled: boolean) => void, error: () => void): () => void;
  ensureProfile(viewer: Viewer): Promise<void>;
  signOut(): Promise<void>;
}

export function observeSession(
  source: SessionSource,
  publish: (session: Session) => void,
  reportError: (error: unknown) => void,
) {
  let revision = 0;
  let active: Viewer | null = null;
  let stopAdmin: (() => void) | undefined;
  const clear = () => {
    active = null;
    stopAdmin?.();
    stopAdmin = undefined;
  };
  const stopUser = source.watchUser((user) => {
    const current = ++revision;
    if (!user) {
      clear();
      publish({ ...pendingSession, ready: true });
      return;
    }
    if (active?.uid !== user.uid) {
      clear();
      publish(pendingSession);
    }
    void (async () => {
      try {
        const token = await user.getIdTokenResult();
        if (current !== revision) return;
        const email = user.email?.toLowerCase() ?? "";
        if (!user.emailVerified || !/^[^@]+@gmail\.com$/.test(email) || token.signInProvider !== "google.com") {
          clear();
          publish(pendingSession);
          reportError(new Error("Please sign in with a verified Google Gmail account."));
          await source.signOut();
          return;
        }
        const username = email.slice(0, -10);
        // A refreshed token for the same identity must not reset confirmed UI or its role listener.
        if (active?.uid === user.uid && active.username === username) return;
        clear();
        const viewer = { uid: user.uid, username };
        try {
          await source.ensureProfile(viewer);
        } catch (error) {
          if (current === revision) reportError(error);
        }
        if (current !== revision) return;
        active = viewer;
        const resolve = (isAdmin: boolean) => {
          if (active === viewer) publish({ viewer, isAdmin, ready: true });
        };
        stopAdmin = source.watchAdmin(
          user.uid,
          (enabled) => resolve(username === "dcep93" && enabled),
          () => resolve(false),
        );
      } catch (error) {
        if (current !== revision) return;
        reportError(error);
        if (!active) publish({ ...pendingSession, ready: true });
      }
    })();
  }, (error) => {
    revision++;
    clear();
    reportError(error);
    publish({ ...pendingSession, ready: true });
  });
  return () => {
    revision++;
    clear();
    stopUser();
  };
}
