import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { EntityKind } from "./data/model";
import { exportUserLog } from "./data/exportLog";
import { exportUserNotes } from "./data/exportNotes";
import { AppProvider, useApp } from "./data/store";
import { Link } from "./components/navigation";
import { canonicalPath, navigate, readRoute, usePath } from "./components/routing";
import { Empty, Message } from "./components/ui";
import { errorMessage } from "./components/errors";
import { UserPage } from "./pages/UserPage";
import { EntityPage } from "./pages/EntityPage";
import { Manager } from "./forms/Manager";
import { UserOptions } from "./components/UserOptions";
import "./styles/theme.css";
import "./styles/layout.css";
import "./styles/forms.css";

function Shell() {
  const path = usePath();
  const route = readRoute(path);
  const { catalog, viewer, isAdmin, ready, loading, error, signIn, signOut } = useApp();
  const [actionError, setActionError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    const canonical = canonicalPath(path);
    if (canonical !== path) navigate(canonical, true);
  }, [path]);
  useEffect(() => {
    const reset = () => {
      setActionError("");
    };
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);
  useEffect(() => {
    document.title = "concertboxd";
    // Temporary showcase: send every homepage visitor to the public dcep93 log.
    if (route.kind === "home") navigate("/user/dcep93", true);
  }, [route.kind]);
  const home = viewer ? `/user/${encodeURIComponent(viewer.username)}` : "/user/dcep93";
  useEffect(() => {
    const goHome = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.isComposing || event.repeat || !ready) return;
      event.preventDefault();
      if (window.location.pathname !== home) navigate(home);
    };
    window.addEventListener("keydown", goHome);
    return () => window.removeEventListener("keydown", goHome);
  }, [home, ready]);
  return (
    <div className="rs-shell">
      {route.kind !== "home" && (
        <header className="rs-header">
          <Link className="rs-brand" href={home}>
            concertboxd
          </Link>
          <nav aria-label="Main" aria-busy={!ready}>
            {ready && (viewer ? (
              <UserOptions
                key={`${viewer.uid}:${path}`}
                username={viewer.username}
                isAdmin={isAdmin}
                busy={signingOut}
                exportDisabled={loading || !!error}
                onExport={async () => {
                  setActionError("");
                  try {
                    await navigator.clipboard.writeText(exportUserLog(catalog, viewer.uid));
                  } catch (caught) {
                    setActionError(errorMessage(caught));
                    throw caught;
                  }
                }}
                onExportNotes={async () => {
                  setActionError("");
                  try {
                    await navigator.clipboard.writeText(exportUserNotes(catalog, viewer.uid));
                  } catch (caught) {
                    setActionError(errorMessage(caught));
                    throw caught;
                  }
                }}
                onManage={() => navigate("/admin/manage")}
                onSignOut={async () => {
                  setSigningOut(true);
                  try {
                    await signOut();
                    navigate("/");
                  } catch (caught) {
                    setActionError(errorMessage(caught));
                  } finally {
                    setSigningOut(false);
                  }
                }}
              />
            ) : (
              <button
                className="rs-account"
                type="button"
                disabled={signingIn}
                onClick={async () => {
                  setSigningIn(true);
                  try {
                    await signIn();
                  } catch {
                    // AppProvider displays sign-in errors through its shared error state.
                  } finally {
                    setSigningIn(false);
                  }
                }}
              >
                {signingIn ? "Signing in…" : "Sign in"}
              </button>
            ))}
          </nav>
        </header>
      )}
      <main className="rs-main">
        {actionError && <Message error>{actionError}</Message>}
        {error && <Message error>{error}</Message>}
        {!ready || route.kind === "home" || loading ? null : route.kind === "user" ? (
          <UserPage key={route.id} username={route.id} />
        ) : route.kind === "manage" ? (
          isAdmin ? <Manager catalog={catalog} /> : <Empty title="Admin access required" />
        ) : ["concert", "venue", "artist"].includes(route.kind) ? (
          <EntityPage key={`${route.kind}:${route.id}`} kind={route.kind as EntityKind} id={route.id} />
        ) : (
          <Empty title="Page not found">
            <Link href={home}>Home</Link>
          </Empty>
        )}
      </main>
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
