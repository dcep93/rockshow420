import { DateTime, IANAZone } from "luxon";
import type { Concert } from "./model";

export const isTimezone = (value: string): boolean => IANAZone.isValidZone(value);

export function concertPeriod(concert: Concert, timezone: string, now: number): "upcoming" | "past" | "unknown" {
  const zone = isTimezone(timezone) ? timezone : "UTC";
  const lastDay = concert.end_date || (concert.date_precision === "day"
    ? concert.date.slice(0, 10)
    : DateTime.fromISO(concert.date, { zone }).toISODate());
  if (!lastDay || !isCalendarDate(lastDay)) return "unknown";
  // Calendar arithmetic keeps the cutoff at local 06:00 across DST changes.
  const cutoff = DateTime.fromISO(lastDay, { zone }).plus({ days: 1 }).set({ hour: 6 });
  return now < cutoff.toMillis() ? "upcoming" : "past";
}
function zoned(iso: string, timezone: string) {
  return iso && isTimezone(timezone) ? DateTime.fromISO(iso, { setZone: true }).setZone(timezone) : null;
}
export function formatConcertDate(iso: string, timezone: string, precision?: string, endDate?: string): string {
  if (precision === "day") {
    const day = DateTime.fromISO(iso.slice(0, 10), { zone: "UTC" });
    if (!day.isValid) return "Date unavailable";
    const end = endDate ? DateTime.fromISO(endDate, { zone: "UTC" }) : null;
    return day.toFormat("ccc, LLL d, yyyy") + (end?.isValid && endDate !== iso.slice(0, 10) ? ` – ${end.toFormat("ccc, LLL d, yyyy")}` : "");
  }
  const value = zoned(iso, timezone);
  if (!value?.isValid) return "Date unavailable";
  const end = endDate ? DateTime.fromISO(endDate, { zone: "UTC" }) : null;
  return value.toFormat("ccc, LLL d, yyyy · h:mm a ZZZZ")
    + (end?.isValid && endDate !== value.toISODate() ? ` – ${end.toFormat("ccc, LLL d, yyyy")}` : "");
}
export function isCalendarDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromISO(value, { zone: "UTC" }).isValid;
}
export function toLocalInput(iso: string, timezone: string): string {
  const value = zoned(iso, timezone);
  return value?.isValid ? value.toFormat("yyyy-MM-dd'T'HH:mm") : "";
}
export function localTimeOptions(localInput: string, timezone: string): { iso: string; label: string }[] {
  if (!isTimezone(timezone) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localInput)) return [];
  const date = DateTime.fromISO(localInput, { zone: timezone });
  // Luxon advances nonexistent local times; an exact round trip rejects those gaps.
  if (!date.isValid || date.toFormat("yyyy-MM-dd'T'HH:mm") !== localInput) return [];
  return date
    .getPossibleOffsets()
    .sort((a, b) => a.toMillis() - b.toMillis())
    .map((option, index, all) => ({
      iso: option.toUTC().toISO()!,
      label: `${all.length > 1 ? (index === 0 ? "Earlier · " : "Later · ") : ""}${option.toFormat("h:mm a ZZZZ")} (UTC${option.toFormat("ZZ")})`,
    }));
}
