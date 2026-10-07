export interface Venue {
  id: string;
  name: string;
  timezone: string;
  location: string;
  image: string;
}
export interface Artist {
  id: string;
  name: string;
  image: string;
}
export interface Concert {
  id: string;
  date: string;
  venue_id: string;
  artist_id: string;
  supporting_artist_ids: string[];
  setlist_fm_url: string;
}
export interface Festival {
  id: string;
  name: string;
  concert_ids: string[];
}
export interface Profile {
  id: string;
  user_id: string;
  username: string;
}
export interface UserConcert {
  id: string;
  user_id: string;
  concert_id: string;
  supporting_artist_ids: string[];
  notes: string;
}
export interface Catalog {
  venues: Venue[];
  artists: Artist[];
  concerts: Concert[];
  festivals: Festival[];
  profiles: Profile[];
  logs: UserConcert[];
}
export type EntityKind = "venue" | "artist" | "concert" | "festival";
export const emptyCatalog: Catalog = {
  venues: [],
  artists: [],
  concerts: [],
  festivals: [],
  profiles: [],
  logs: [],
};
export const EMPTY_CATALOG = emptyCatalog;
export const collections = {
  venue: "venues",
  artist: "artists",
  concert: "concerts",
  festival: "festivals",
} as const;

const string = (value: unknown): string => (typeof value === "string" ? value : "");
const strings = (value: unknown): string[] =>
  Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string"))] : [];
export function timestampISO(value: unknown): string {
  try {
    const candidate =
      value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
        ? value.toDate()
        : value;
    if (!(candidate instanceof Date) && typeof candidate !== "string") return "";
    const date = candidate instanceof Date ? candidate : new Date(candidate);
    return Number.isFinite(date.getTime()) ? date.toISOString() : "";
  } catch {
    return "";
  }
}
type Raw = Record<string, unknown>;
export const normalizeVenue = (id: string, raw: Raw): Venue => ({
  id,
  name: string(raw.name),
  timezone: string(raw.timezone),
  location: string(raw.location),
  image: string(raw.image),
});
export const normalizeArtist = (id: string, raw: Raw): Artist => ({
  id,
  name: string(raw.name),
  image: string(raw.image),
});
export const normalizeConcert = (id: string, raw: Raw): Concert => ({
  id,
  date: timestampISO(raw.date),
  venue_id: string(raw.venue_id),
  artist_id: string(raw.artist_id),
  supporting_artist_ids: strings(raw.supporting_artist_ids),
  setlist_fm_url: string(raw.setlist_fm_url),
});
export const normalizeFestival = (id: string, raw: Raw): Festival => ({
  id,
  name: string(raw.name),
  concert_ids: strings(raw.concert_ids),
});
export const normalizeProfile = (id: string, raw: Raw): Profile => ({
  id,
  user_id: string(raw.user_id),
  username: string(raw.username) || id,
});
export const normalizeLog = (id: string, raw: Raw): UserConcert => ({
  id,
  user_id: string(raw.user_id),
  concert_id: string(raw.concert_id),
  supporting_artist_ids: strings(raw.supporting_artist_ids),
  notes: string(raw.notes),
});
