import type { Artist, Concert } from "./model";

export type Song = { name: string; notes?: string; tape?: boolean; artists?: string; explicit?: boolean };
export type SongSet = { name?: string; encore?: boolean; songs: Song[] };
export type PerformanceSetlist = { kind: "setlist_fm"; url: string; sets: SongSet[]; notes?: string };
export type MusicalProgram = { kind: "musical_program"; url: string; title: string; production: string; basis: string; sets: SongSet[]; notes?: string };
export type SpotifyTopTracks = { kind: "spotify_top_tracks"; url: string; artist: string; songs: Song[] };
export type SongList = PerformanceSetlist | MusicalProgram | SpotifyTopTracks;
export type SongCaches = {
  setlists: Record<string, PerformanceSetlist>;
  musicals: Record<string, MusicalProgram>;
  spotify: Record<string, SpotifyTopTracks>;
};
export type SongDisclosure = { key: string; title: string; label: string; value: SongList };

export function concertSongLists(concert: Pick<Concert, "id" | "artist_id" | "supporting_artist_ids">, artists: Artist[], caches: SongCaches): SongDisclosure[] {
  const names = new Map(artists.map(a => [a.id, a.name]));
  const ids = [...new Set([concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean))];
  const lists: SongDisclosure[] = [];
  for (const id of ids) {
    const key = `${encodeURIComponent(id)}:${encodeURIComponent(concert.id)}`;
    const value = caches.setlists[key];
    if (value) lists.push({ key, title: names.get(id) || id, label: "setlist.fm", value });
  }
  const program = caches.musicals[concert.id];
  if (program) lists.push({ key: `musical:${concert.id}`, title: program.title, label: "Musical program", value: program });
  for (const id of ids) {
    const value = caches.spotify[id];
    if (value) lists.push({ key: `spotify:${id}`, title: names.get(id) || value.artist, label: `Spotify top ${value.songs.length}`, value });
  }
  return lists;
}
