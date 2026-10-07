import { DateTime, IANAZone } from "luxon";

export const isTimezone = (value: string): boolean => IANAZone.isValidZone(value);
function zoned(iso: string, timezone: string) {
  return iso && isTimezone(timezone) ? DateTime.fromISO(iso, { setZone: true }).setZone(timezone) : null;
}
export function formatConcertDate(iso: string, timezone: string): string {
  const value = zoned(iso, timezone);
  return value?.isValid ? value.toFormat("ccc, LLL d, yyyy · h:mm a ZZZZ") : "Date unavailable";
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
