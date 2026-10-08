import { DateTime } from "luxon";
import type { Catalog, Concert, TicketStatus } from "./model";
import { selectedArtistIds } from "./schedules";
import { userConcertRows } from "./model";
import { isCalendarDate, isTimezone } from "./time";

const prefixes: Record<TicketStatus, string> = { "": "", purchased: "$", sold_out: "%", cancelled: "!" };
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const oneLine = (value: string) => value.replace(/\s+/gu, " ").trim();
type Entry = { id: string; start: string; end: string; title: string; venue: string; prefix: string; key: string };

function calendarDay(concert: Concert, timezone?: string): string {
  if (concert.date_precision === "day") {
    const day = concert.date.slice(0, 10);
    if (isCalendarDate(day)) return day;
  } else if (timezone && isTimezone(timezone)) {
    const date = DateTime.fromISO(concert.date, { setZone: true }).setZone(timezone);
    if (date.isValid) return date.toISODate()!;
  }
  throw new Error("Cannot export a concert with an unavailable date or timezone.");
}

function dateRange(start: string, end: string): string {
  const [year, month, day] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  if (start === end) return `${month}/${day}`;
  if (year !== endYear) return `${month}/${day}/${year}-${endMonth}/${endDay}/${endYear}`;
  return `${month}/${day}-${month === endMonth ? endDay : `${endMonth}/${endDay}`}`;
}

// Only current catalog data and this user's overrides determine the output.
// Imported source wording, IDs, today's date and browser locale play no role.
export function exportUserLog(catalog: Catalog, uid: string): string {
  const artists = new Map(catalog.artists.map((artist) => [artist.id, artist.name]));
  const venues = new Map(catalog.venues.map((venue) => [venue.id, venue]));
  const artistName = (id: string) => {
    const name = artists.get(id);
    if (!name?.trim()) throw new Error("Cannot export an unavailable artist.");
    return oneLine(name);
  };
  const groups = new Map<string, Entry[]>();
  for (const { concert, log } of userConcertRows(catalog, uid)) {
    if (!concert) throw new Error("Cannot export an unavailable concert.");
    const venue = venues.get(concert.venue_id);
    if (concert.venue_id && !venue) throw new Error("Cannot export an unavailable venue.");
    const selected = new Set(selectedArtistIds(catalog, concert, log));
    const support = concert.supporting_artist_ids.filter((id) => selected.has(id) && id !== concert.artist_id);
    const title = oneLine(concert.name || [artistName(concert.artist_id), ...support.map(artistName)].join(" + "));
    const start = calendarDay(concert, venue?.timezone);
    const end = concert.end_date || start;
    if (!isCalendarDate(end) || end < start) throw new Error("Cannot export an invalid date range.");
    const prefix = prefixes[log?.ticket_status || ""];
    const key = JSON.stringify([concert.name || concert.artist_id, concert.venue_id, support, prefix, start.slice(0, 4)]);
    const entry: Entry = { id: concert.id, start, end, title, venue: oneLine(venue?.name || ""), prefix, key };
    const group = groups.get(key) || [];
    group.push(entry);
    groups.set(key, group);
  }
  const runs: Entry[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => compare(a.start, b.start) || compare(a.end, b.end) || compare(a.id, b.id));
    // Same-day shows remain separate; ranges never imply a skipped or hidden day.
    for (const entry of group) {
      const previous = runs.at(-1);
      const adjacent = previous && DateTime.fromISO(previous.end, { zone: "UTC" }).plus({ days: 1 }).toISODate() === entry.start;
      if (previous?.key === entry.key && adjacent && previous.end.slice(0, 4) === entry.end.slice(0, 4)) {
        previous.end = entry.end;
      } else runs.push({ ...entry });
    }
  }
  runs.sort((a, b) => compare(b.start, a.start) || compare(b.end, a.end) || compare(a.title, b.title) || compare(a.venue, b.venue) || compare(a.prefix, b.prefix) || compare(a.id, b.id));
  const years = new Map<string, string[]>();
  for (const entry of runs) {
    const year = entry.start.slice(0, 4);
    const lines = years.get(year) || [];
    lines.push(`${entry.prefix}${entry.title} ${dateRange(entry.start, entry.end)}${entry.venue ? ` ${entry.venue}` : ""}`);
    years.set(year, lines);
  }
  return [...years].map(([year, lines]) => [...lines, year].join("\n")).join("\n\n\n");
}
