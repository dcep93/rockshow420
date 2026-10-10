import { DateTime } from "luxon";
import type { Artist, Concert, ScheduledSet } from "./model";

export type Song = { name: string; notes?: string; tape?: boolean; artists?: string; explicit?: boolean };
export type SongSet = { name?: string; encore?: boolean; songs: Song[] };
export type PerformanceSetlist = { kind: "setlist_fm"; url: string; set_id?: string; sets: SongSet[]; notes?: string };
export type MusicalProgram = { kind: "musical_program"; url: string; title: string; production: string; basis: string; sets: SongSet[]; notes?: string };
export type SpotifyTopTracks = { kind: "spotify_top_tracks"; url: string; artist: string; songs: Song[] };
export type SongList = PerformanceSetlist | MusicalProgram | SpotifyTopTracks;
export type SongCaches = {
  setlists: Record<string, PerformanceSetlist[]>;
  musicals: Record<string, MusicalProgram>;
  spotify: Record<string, SpotifyTopTracks>;
};
export type SongDisclosure = { key: string; title: string; label: string; value: SongList };

type SongConcert = Pick<Concert, "id" | "artist_id" | "supporting_artist_ids">;

export function hasCachedConcertSource(concert: SongConcert & Pick<Concert, "setlist_fm_url">, setlists: SongCaches["setlists"]): boolean {
  return [concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean).some(id =>
    (setlists[`${encodeURIComponent(id)}:${encodeURIComponent(concert.id)}`] || []).some(value =>
      value.kind === "setlist_fm" && value.set_id === undefined && (id === concert.artist_id || value.url === concert.setlist_fm_url)
      && value.sets.some(set => set.songs.length > 0)));
}

export function artistSongLists(concertId: string, artistId: string, title: string, caches: SongCaches, setId?: string): SongDisclosure[] {
  const key = `${encodeURIComponent(artistId)}:${encodeURIComponent(concertId)}`;
  // A schedule row must only receive the performance explicitly assigned to it.
  const performances = (caches.setlists[key] || []).filter(value => value.set_id === setId);
  const lists: SongDisclosure[] = performances.map(value => ({
    key: `${key}:${value.set_id || "concert"}:${value.url}`, title, label: "Songs", value,
  }));
  const top = caches.spotify[artistId];
  if (top?.songs.length) lists.push({ key: `spotify:${artistId}`, title: title || top.artist, label: `Top ${top.songs.length} · Spotify`, value: top });
  return lists.filter(({ value }) => value.kind === "spotify_top_tracks" || value.sets.some(set => set.songs.length));
}

export function concertSongLists(concert: SongConcert, artists: Artist[], caches: SongCaches): SongDisclosure[] {
  const names = new Map(artists.map(a => [a.id, a.name]));
  const ids = [...new Set([concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean))];
  const lists = ids.flatMap(id => artistSongLists(concert.id, id, names.get(id) || id, caches));
  const program = caches.musicals[concert.id];
  if (program?.sets.some(set => set.songs.length)) lists.push({ key: `musical:${concert.id}`, title: program.title, label: "Musical program", value: program });
  return lists;
}

export function groupScheduleDays(sets: ScheduledSet[], timezone: string): { day: string; sets: ScheduledSet[] }[] {
  const groups = new Map<string, ScheduledSet[]>();
  for (const set of sets) {
    const day = set.day || (set.start ? DateTime.fromISO(set.start).setZone(timezone).toISODate() : "") || "";
    const group = groups.get(day) || [];
    group.push(set);
    groups.set(day, group);
  }
  return [...groups].sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"))
    .map(([day, rows]) => ({ day, sets: rows.sort((a, b) => {
      const aTime = a.start ? Date.parse(a.start) : -Infinity;
      const bTime = b.start ? Date.parse(b.start) : -Infinity;
      return bTime - aTime || (b.stage || "").localeCompare(a.stage || "") || b.id.localeCompare(a.id);
    }) }));
}
