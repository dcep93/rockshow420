import { useEffect, useState } from "react";
import type { SongCaches } from "../data/songLists";

let cacheRequest: Promise<SongCaches> | undefined;
function loadSongCaches(): Promise<SongCaches> {
  cacheRequest ??= Promise.all([
    import("../data/cached.setlist.fm.json"),
    import("../data/cached.musicals.json"),
    import("../data/cached.spotify.json"),
  ]).then(([setlists, musicals, spotify]) => ({
    setlists: setlists.default, musicals: musicals.default, spotify: spotify.default,
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

