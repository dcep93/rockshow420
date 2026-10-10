import type { Catalog } from "./model";

export function concertOwner(catalog: Catalog) {
  return catalog.profiles.find(profile => profile.username === "dcep93");
}

export function concertLogEntries(catalog: Catalog, concertId: string, viewerUid?: string, isAdmin = false, retainViewer = false) {
  const ownerUid = concertOwner(catalog)?.user_id;
  const logs = new Map(catalog.logs.filter(log => log.concert_id === concertId).map(log => [log.user_id, log]));
  return catalog.profiles
    .filter(profile => profile.username !== "dcep93" && profile.user_id !== ownerUid)
    .map(profile => ({ profile, log: logs.get(profile.user_id) }))
    .filter(({ profile, log }) => {
      const own = profile.user_id === viewerUid;
      return (log || (own && retainViewer)) && (!log?.removed || own || isAdmin);
    });
}
