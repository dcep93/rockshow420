import type { Catalog } from "./model";
import { userConcertRows } from "./model";
import { concertName } from "./presentation";
import { formatConcertDate } from "./time";

export function exportUserNotes(catalog: Catalog, uid: string): string {
  const timezones = new Map(catalog.venues.map(venue => [venue.id, venue.timezone]));
  return userConcertRows(catalog, uid, true)
    .filter(({ log }) => log?.notes.trim())
    .map(({ concert, log }) => {
      const heading = concert
        ? `${concertName(concert, catalog)} — ${formatConcertDate(concert.date, timezones.get(concert.venue_id) || "UTC", concert.date_precision, concert.end_date)}`
        : "Concert unavailable";
      return `${heading}\n${log!.notes}`;
    }).join("\n\n");
}
