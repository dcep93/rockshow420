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
  name?: string;
  date_precision?: "day" | "time";
  end_date?: string;
  venue_id: string;
  artist_id: string;
  supporting_artist_ids: string[];
  setlist_fm_url: string;
  purchase_link?: string;
}
export interface ScheduledSet {
  id: string;
  artist_id: string;
  day?: string;
  start?: string;
  end?: string;
  stage?: string;
}
export interface Schedule { id: string; sets: ScheduledSet[] }
export interface Profile {
  id: string;
  user_id: string;
  username: string;
}
export type TicketStatus = "" | "purchased" | "sold_out" | "cancelled";
export const ticketStatusLabels: Record<TicketStatus, string> = { "": "", purchased: "Purchased", sold_out: "Sold out", cancelled: "Cancelled" };
export const ticketStatusSymbols: Record<TicketStatus, string> = { "": "", purchased: "$", sold_out: "%", cancelled: "!" };
export function isTicketStatus(value: unknown): value is TicketStatus {
  return value === "" || value === "purchased" || value === "sold_out" || value === "cancelled";
}
export interface UserConcert {
  removed: boolean;
  seen_set_ids: string[];
  id: string;
  user_id: string;
  concert_id: string;
  supporting_artist_ids: string[];
  notes: string;
  ticket_status: TicketStatus;
}
export interface Catalog {
  venues: Venue[];
  artists: Artist[];
  concerts: Concert[];
  schedules: Schedule[];
  profiles: Profile[];
  logs: UserConcert[];
}
export type EntityKind = "venue" | "artist" | "concert";
export const emptyCatalog: Catalog = {
  venues: [],
  artists: [],
  concerts: [],
  schedules: [],
  profiles: [],
  logs: [],
};
export const EMPTY_CATALOG = emptyCatalog;
export const collections = {
  venue: "venues",
  artist: "artists",
  concert: "concerts",
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
  ...(string(raw.name) ? { name: string(raw.name) } : {}),
  ...(raw.date_precision === "day" ? { date_precision: "day" as const } : {}),
  ...(string(raw.end_date) ? { end_date: string(raw.end_date) } : {}),
  venue_id: string(raw.venue_id),
  artist_id: string(raw.artist_id),
  supporting_artist_ids: strings(raw.supporting_artist_ids),
  setlist_fm_url: string(raw.setlist_fm_url),
  ...(string(raw.purchase_link) ? { purchase_link: string(raw.purchase_link) } : {}),
});
export const normalizeSchedule = (id: string, raw: Raw): Schedule => ({
  id,
  sets: Object.entries((raw.sets || {}) as Record<string, Raw>).map(([id, value]) => ({
    id, artist_id: string(value.artist_id),
    ...(string(value.day) ? { day: string(value.day) } : {}),
    ...(string(value.start) ? { start: string(value.start) } : {}),
    ...(string(value.end) ? { end: string(value.end) } : {}),
    ...(string(value.stage) ? { stage: string(value.stage) } : {}),
  })).sort((a, b) => {
    // UTC fallback keeps undated sets chronological across offsets. Explicit
    // programme days group by their stated date, including overnight starts.
    const aDay = a.day || timestampISO(a.start).slice(0, 10);
    const bDay = b.day || timestampISO(b.start).slice(0, 10);
    return Number(!aDay) - Number(!bDay) || aDay.localeCompare(bDay)
      || (a.start && b.start ? Date.parse(a.start) - Date.parse(b.start) : Number(!a.start) - Number(!b.start))
      || (a.stage || "").localeCompare(b.stage || "") || a.id.localeCompare(b.id);
  }),
});
export const normalizeProfile = (id: string, raw: Raw): Profile => ({
  id,
  user_id: string(raw.user_id),
  username: string(raw.username) || id,
});
export const normalizeLog = (id: string, raw: Raw): UserConcert => ({
  removed: raw.removed === true,
  seen_set_ids: strings(raw.seen_set_ids),
  id,
  user_id: string(raw.user_id),
  concert_id: string(raw.concert_id),
  supporting_artist_ids: strings(raw.supporting_artist_ids),
  notes: string(raw.notes),
  ticket_status: isTicketStatus(raw.ticket_status) ? raw.ticket_status : "",
});

// Missing user data means the concert is included, with no personal annotations.
export function userConcertRows(catalog: Catalog, uid: string, includeHidden = false) {
  const logs = new Map(catalog.logs.filter((log) => log.user_id === uid).map((log) => [log.concert_id, log]));
  const rows: { concert?: Concert; log?: UserConcert }[] = catalog.concerts
    .filter((concert) => includeHidden || !logs.get(concert.id)?.removed)
    .map((concert) => ({ concert, log: logs.get(concert.id) }));
  const concertIds = new Set(catalog.concerts.map((concert) => concert.id));
  for (const log of logs.values()) {
    if ((includeHidden || !log.removed) && !concertIds.has(log.concert_id)) rows.push({ log });
  }
  return rows.sort((a, b) => (b.concert?.date || "").localeCompare(a.concert?.date || ""));
}
