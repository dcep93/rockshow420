/** Reviewed catalog-only patches. Never modify personal records. */
import { isDeepStrictEqual as equal } from "node:util";
import { Timestamp } from "firebase/firestore";
import { cleanSchema } from "./cleanSchema";
import { timestampISO } from "./model";
import { validateTableSize, type TableBackup } from "./migrateTables";
import { tableNames } from "./tables";

type Row = Record<string, any>;
export type CatalogCorrections = {
  id: string;
  artists: Record<string, Row>;
  lineup_additions: { concert_id: string; artist_id: string; set_id: string; set: Row; sources: string[] }[];
  concert_updates: { id: string; expected: Row; changes: Row; sources: string[] }[];
};

export function projectCorrections(current: TableBackup, patch: CatalogCorrections): TableBackup {
  const next: TableBackup = { ...current, artists: { ...current.artists }, concerts: { ...current.concerts }, schedules: { ...current.schedules } };
  for (const [id, value] of Object.entries(patch.artists)) {
    if (next.artists[id] && !Object.entries(value).every(([key, field]) => equal(next.artists[id][key], field))) throw new Error(`Conflicting artist ${id}`);
    next.artists[id] ||= value;
  }
  for (const addition of patch.lineup_additions) {
    const { concert_id: id, artist_id: artist, set_id: setId, set } = addition;
    const concert = next.concerts[id];
    const schedule = next.schedules[id];
    if (!concert || !schedule || !next.artists[artist] || set.artist_id !== artist || !addition.sources.length) throw new Error(`Invalid lineup addition ${id}`);
    if (schedule.sets[setId] && !equal(schedule.sets[setId], set)) throw new Error(`Conflicting set ${id}/${setId}`);
    if (!schedule.sets[setId] && Object.values(schedule.sets).some((row: any) => row.artist_id === artist && row.day === set.day)) throw new Error(`Artist already scheduled: ${id}/${artist}`);
    next.concerts[id] = { ...concert, supporting_artist_ids: [...new Set([...(concert.supporting_artist_ids || []), artist])] };
    next.schedules[id] = { ...schedule, sets: { ...schedule.sets, [setId]: set } };
  }
  for (const update of patch.concert_updates) {
    const row = next.concerts[update.id];
    if (!row || !update.sources.length) throw new Error(`Missing concert or source: ${update.id}`);
    const same = (key: string, value: unknown) => key === "date" ? Date.parse(timestampISO(row.date)) === Date.parse(value as string) : equal(row[key], value);
    if (Object.entries(update.changes).every(([key, value]) => same(key, value))) continue;
    if (!Object.entries(update.expected).every(([key, value]) => same(key, value))) throw new Error(`Concert edited since research: ${update.id}`);
    const changes = { ...update.changes };
    if (typeof changes.date === "string") changes.date = Timestamp.fromDate(new Date(changes.date));
    next.concerts[update.id] = { ...row, ...changes };
  }
  if (!equal(cleanSchema(next), next)) throw new Error("Catalog correction violates clean schema");
  for (const name of tableNames) validateTableSize(next[name]);
  return next;
}
