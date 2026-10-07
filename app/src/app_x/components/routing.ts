import { useEffect, useState } from "react";

export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, "", path);
  else window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const update = () => setPath(window.location.pathname);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
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
  return `/${kind}/${encodeURIComponent(id)}/${slug(name)}`;
}

export function readRoute(path: string) {
  try {
    const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
    if (!parts.length) return { kind: "home", id: "" };
    if (parts[0] === "user" && parts.length === 2) return { kind: "user", id: parts[1].toLowerCase() };
    if (
      ["venue", "artist", "festival", "concert"].includes(parts[0]) &&
      parts.length >= 2 &&
      parts.length <= 3
    )
      return { kind: parts[0], id: parts[1] };
  } catch {
    /* Malformed URL is a not-found page. */
  }
  return { kind: "missing", id: "" };
}
