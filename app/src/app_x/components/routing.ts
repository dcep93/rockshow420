import { useEffect, useState } from "react";
import festivalConcertIds from "../data/festivalConcertIds.json";
import { canonicalId } from "../data/ids";
import { updateFeedView } from "../data/feedView";

export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    let currentPath = window.location.pathname;
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const update = () => {
      const nextPath = window.location.pathname;
      if (nextPath === currentPath) return;
      const outgoing = readRoute(currentPath);
      if (outgoing.kind === "user") updateFeedView(outgoing.id, { scrollY: window.scrollY });
      currentPath = nextPath;
      setPath(nextPath);
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("popstate", update);
      window.history.scrollRestoration = restoration;
    };
  }, []);
  return path;
}

export function slug(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "details"
  );
}

export function entityPath(kind: string, id: string, name: string) {
  return `/${kind}/${encodeURIComponent(canonicalId(kind, id))}/${slug(name)}`;
}

export function canonicalPath(path: string): string {
  try {
    const parts = path.split("/");
    const id = decodeURIComponent(parts[2] || "");
    const canonical = canonicalId(parts[1], id);
    const target = parts[1] === "festival" && Object.hasOwn(festivalConcertIds, canonical) ? (festivalConcertIds as Record<string, string>)[canonical] : undefined;
    const next = target || canonical;
    if (target) parts[1] = "concert";
    if (next !== id) {
      parts[2] = encodeURIComponent(next);
      return parts.join("/");
    }
  } catch { /* Keep malformed paths for the not-found page. */ }
  return path;
}

export function readRoute(path: string) {
  path = canonicalPath(path);
  try {
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { kind: "home", id: "" };
    if (parts.length === 2 && parts[0] === "admin" && parts[1] === "manage")
      return { kind: "manage", id: "" };
    if (parts[0] === "user" && parts.length === 2) return { kind: "user", id: parts[1].toLowerCase() };
    if (
      ["venue", "artist", "concert"].includes(parts[0]) &&
      parts.length >= 2 &&
      parts.length <= 3
    )
      return { kind: parts[0], id: canonicalId(parts[0], parts[1]) };
  } catch {
    /* Malformed URL is a not-found page. */
  }
  return { kind: "missing", id: "" };
}
