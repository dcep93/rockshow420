import type { Artist, Concert, Schedule } from "./model";
import type { SongCaches, SongSet } from "./songLists";

export type ConcertSearchEntry = { title: string; artists: string[]; songs: string[] };
export type SetlistCaches = Pick<SongCaches, "setlists" | "musicals">;

export function normalizeSearch(value: string): string {
  return value.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/ +/g, " ").trim();
}

/** Build once per catalog change; neither building nor matching performs I/O. */
export function buildConcertSearch(concerts: Concert[], artists: Artist[], schedules: Schedule[], caches: SetlistCaches): Map<string, ConcertSearchEntry> {
  const names = new Map(artists.map(artist => [artist.id, normalizeSearch(artist.name)]));
  const performances = new Map(schedules.map(schedule => [schedule.id, schedule.sets]));
  return new Map(concerts.map(concert => {
    const scheduled = performances.get(concert.id) || [];
    const ids = [...new Set([concert.artist_id, ...concert.supporting_artist_ids, ...scheduled.map(set => set.artist_id)].filter(Boolean))];
    const songs = new Set<string>();
    const addSongs = (sets: SongSet[]) => {
      for (const set of sets) for (const song of set.songs) {
        const name = normalizeSearch(song.name);
        if (name) songs.add(name);
      }
    };
    for (const id of ids) {
      const key = `${encodeURIComponent(id)}:${encodeURIComponent(concert.id)}`;
      for (const value of caches.setlists[key] || []) {
        if (value.kind !== "setlist_fm") continue;
        const matched = scheduled.length
          ? scheduled.some(set => set.id === value.set_id && set.artist_id === id)
          : value.set_id === undefined;
        if (matched) addSongs(value.sets);
      }
    }
    const program = caches.musicals[concert.id];
    if (program?.kind === "musical_program") addSongs(program.sets);
    return [concert.id, { title: normalizeSearch(concert.name || ""), artists: ids.map(id => names.get(id) || "").filter(Boolean), songs: [...songs] }];
  }));
}

export function matchesConcertSearch(entry: ConcertSearchEntry | undefined, query: string, searchSetlists = false): boolean {
  const term = normalizeSearch(query);
  return !term || !!entry && (entry.title.includes(term) || entry.artists.some(name => name.includes(term))
    || searchSetlists && entry.songs.some(name => name.includes(term)));
}
