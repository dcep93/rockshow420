import { useEffect, useState } from "react";
import type { SongCaches } from "../data/songLists";
import { setlistCaches } from "../data/setlistCaches";

let cacheRequest: Promise<SongCaches> | undefined;
function loadSongCaches(): Promise<SongCaches> {
  cacheRequest ??= import("../data/cached.spotify.json").then(spotify => ({
    ...setlistCaches, spotify: spotify.default,
  }) as SongCaches).catch(error => { cacheRequest = undefined; throw error; });
  return cacheRequest;
}

export function useSongCaches() {
  const [caches, setCaches] = useState<SongCaches | null>(null);
  useEffect(() => {
    let active = true;
    loadSongCaches().then(value => { if (active) setCaches(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return caches;
}
