import { DateTime } from "luxon";
import type { Catalog, Concert, ScheduledSet, UserConcert } from "./model";

export function selectedArtistIds(catalog: Catalog, concert: Concert, log?: UserConcert | null): string[] {
  const schedule = catalog.schedules.find(item => item.id === concert.id);
  if (!schedule?.sets.length) return log?.supporting_artist_ids || [];
  const seen = new Set(log?.seen_set_ids || []);
  return [...new Set(schedule.sets.filter(set => seen.has(set.id)).map(set => set.artist_id))];
}

export function validateSchedule(sets: ScheduledSet[], concert: Concert, timezone: string): void {
  const ids = new Set<string>();
  const lineup = new Set([concert.artist_id, ...concert.supporting_artist_ids].filter(Boolean));
  const first = concert.date_precision === "day" ? concert.date.slice(0, 10) : DateTime.fromISO(concert.date).setZone(timezone).toISODate();
  const last = concert.end_date || first;
  for (const set of sets) {
    if (!/^[a-z0-9]{6}$/.test(set.id) || ids.has(set.id)) throw new Error("Each set needs a unique six-character ID.");
    ids.add(set.id);
    if (!lineup.has(set.artist_id)) throw new Error("Each scheduled artist must belong to the concert lineup.");
    if (set.day !== undefined) {
      if (typeof set.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(set.day)
        || DateTime.fromISO(set.day, { zone: "UTC" }).toISODate() !== set.day)
        throw new Error("Each set day must be a valid date in YYYY-MM-DD format.");
      if (!first || !last || set.day < first || set.day > last) throw new Error("Each set day must be within the concert date range.");
    }
    for (const time of [set.start, set.end].filter(Boolean) as string[]) {
      if (!/(Z|[+-]\d{2}:\d{2})$/.test(time) || !DateTime.fromISO(time, { setZone: true }).isValid)
        throw new Error("Schedule times must include a valid timezone offset.");
    }
    if (set.start) {
      if (!timezone || !DateTime.now().setZone(timezone).isValid) throw new Error("A venue timezone is required for scheduled times.");
      const day = DateTime.fromISO(set.start).setZone(timezone).toISODate()!;
      if (set.day) {
        const nextDay = DateTime.fromISO(set.day, { zone: "UTC" }).plus({ days: 1 }).toISODate()!;
        if (day < set.day || day > nextDay) throw new Error("Each set must start on its programme day or the following day.");
      } else if (!first || !last || day < first || day > last) throw new Error("Each set must start within the concert date range.");
    }
    if (set.end && (!set.start || Date.parse(set.end) <= Date.parse(set.start))) throw new Error("A set must end after it starts.");
    if (set.stage !== undefined && (typeof set.stage !== "string" || set.stage.length > 200)) throw new Error("Stage must be at most 200 characters.");
  }
}

export function setLabel(set: ScheduledSet, catalog: Catalog, concert: Concert): string {
  const artist = catalog.artists.find(item => item.id === set.artist_id)?.name || "Unavailable artist";
  const zone = catalog.venues.find(item => item.id === concert.venue_id)?.timezone || "UTC";
  const time = set.start ? DateTime.fromISO(set.start).setZone(zone).toFormat("ccc, LLL d · h:mm a ZZZZ")
    : set.day ? DateTime.fromISO(set.day, { zone }).toFormat("ccc, LLL d") : "";
  return [artist, time, set.stage].filter(Boolean).join(" · ");
}
