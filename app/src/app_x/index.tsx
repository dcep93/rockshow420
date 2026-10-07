import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Concert, EntityKind, Profile, UserConcert } from "./data/model";
import { AppProvider, useApp } from "./data/store";
import { saveLog } from "./data/actions";
import { Link } from "./components/navigation";
import { navigate, readRoute, usePath } from "./components/routing";
import { Empty, Message } from "./components/ui";
import { errorMessage } from "./components/errors";
import { Login } from "./pages/Login";
import { UserPage } from "./pages/UserPage";
import { EntityPage } from "./pages/EntityPage";
import { ConcertPicker } from "./forms/ConcertPicker";
import { LogEditor } from "./forms/LogEditor";
import { EntityEditor } from "./forms/EntityEditor";
import { Manager } from "./forms/Manager";
import { ProfileEditor } from "./forms/ProfileEditor";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/forms.css";

type Overlay =
  | { type: "picker"; uid: string }
  | { type: "log"; concert: Concert; log?: UserConcert; uid: string }
  | { type: "entity"; kind: EntityKind; id?: string; addFor?: string }
  | { type: "manager" }
  | { type: "profile"; profile: Profile }
  | null;

function Shell() {
  const path = usePath();
  const route = readRoute(path);
  const { catalog, viewer, isAdmin, ready, loading, error, signOut } = useApp();
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [actionError, setActionError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const close = () => setOverlay(null);
  useEffect(() => {
    const reset = () => {
      setOverlay(null);
      setActionError("");
    };
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);
  useEffect(() => {
    document.title = route.kind === "user" ? `@${route.id} · rockshow420` : "rockshow420";
    if (ready && viewer && route.kind === "home")
      navigate(`/user/${encodeURIComponent(viewer.username)}`, true);
  }, [ready, viewer, route.kind, route.id]);
  const editLog = (concert: Concert, log?: UserConcert) => {
    if (viewer) setOverlay({ type: "log", concert, log, uid: log?.user_id || viewer.uid });
  };
  const editEntity = (kind: EntityKind, id?: string) => setOverlay({ type: "entity", kind, id });
  const home = viewer ? `/user/${encodeURIComponent(viewer.username)}` : "/";
  return (
    <div className="rs-shell">
      {route.kind !== "home" && (
        <header className="rs-header">
          <Link className="rs-brand" href={home}>
            rockshow420
          </Link>
          <nav aria-label="Main">
            {isAdmin && (
              <button type="button" className="rs-text-button" onClick={() => setOverlay({ type: "manager" })}>
                Manage
              </button>
            )}
            {viewer ? (
              <>
                <Link className="rs-account" href={home}>
                  @{viewer.username}
                </Link>
                <button
                  type="button"
                  className="rs-text-button"
                  disabled={signingOut}
                  onClick={async () => {
                    setSigningOut(true);
                    try {
                      await signOut();
                      close();
                      navigate("/");
                    } catch (caught) {
                      setActionError(errorMessage(caught));
                    } finally {
                      setSigningOut(false);
                    }
                  }}
                >
                  {signingOut ? "Signing out…" : "Sign out"}
                </button>
              </>
            ) : (
              route.kind !== "home" && (
                <Link className="rs-account" href="/">
                  Sign in
                </Link>
              )
            )}
          </nav>
        </header>
      )}
      <main className={route.kind === "home" ? "rs-main rs-main-login" : "rs-main"}>
        {actionError && <Message error>{actionError}</Message>}
        {error && <Message error>{error}</Message>}
        {!ready ? (
          <Message>Loading…</Message>
        ) : route.kind === "home" ? (
          <Login />
        ) : loading ? (
          <Message>Loading concerts…</Message>
        ) : route.kind === "user" ? (
          <UserPage
            username={route.id}
            onAdd={(uid) => setOverlay({ type: "picker", uid })}
            onEdit={editLog}
            onProfile={(profile) => setOverlay({ type: "profile", profile })}
          />
        ) : ["concert", "venue", "artist", "festival"].includes(route.kind) ? (
          <EntityPage kind={route.kind as EntityKind} id={route.id} onEdit={editEntity} onLog={editLog} />
        ) : (
          <Empty title="That page isn’t here.">
            <Link href={home}>Back to your page</Link>
          </Empty>
        )}
      </main>
      {overlay?.type === "picker" && viewer && (
        <ConcertPicker
          catalog={catalog}
          uid={overlay.uid}
          isAdmin={isAdmin}
          onClose={close}
          onSelect={(concert) => setOverlay({ type: "log", uid: overlay.uid, concert })}
          onCreate={() => setOverlay({ type: "entity", kind: "concert", addFor: overlay.uid })}
        />
      )}
      {overlay?.type === "log" && viewer && (
        <LogEditor
          key={overlay.log?.id || overlay.concert.id}
          catalog={catalog}
          concert={overlay.concert}
          log={overlay.log}
          uid={overlay.uid}
          onClose={close}
        />
      )}
      {overlay?.type === "manager" && isAdmin && (
        <Manager catalog={catalog} onEdit={editEntity} onClose={close} />
      )}
      {overlay?.type === "entity" && isAdmin && (
        <EntityEditor
          key={`${overlay.kind}-${overlay.id || "new"}`}
          kind={overlay.kind}
          id={overlay.id}
          catalog={catalog}
          onClose={close}
          onSaved={async (id) => {
            if (overlay.addFor && overlay.kind === "concert")
              await saveLog(overlay.addFor, id, { notes: "", supporting_artist_ids: [] });
            close();
          }}
        />
      )}
      {overlay?.type === "profile" && viewer && <ProfileEditor profile={overlay.profile} onClose={close} />}
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="rs-shell">
        <main className="rs-main">
          <Empty title="Something went wrong.">
            <p>Please reload to try again.</p>
            <button type="button" className="rs-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </Empty>
        </main>
      </div>
    ) : (
      this.props.children
    );
  }
}

export default function AppX() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  );
}
