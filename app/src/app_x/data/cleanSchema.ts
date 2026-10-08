import { DateTime } from "luxon";
import { isTicketStatus, timestampISO } from "./model";
import type { TableBackup, LegacyBackup } from "./migrateTables";
import { normalizeConcert } from "./model";
import { validateSchedule } from "./schedules";
import type { ScheduledSet } from "./model";
import { tableNames } from "./tables";

const fields = {
  venues: ["name", "timezone", "location", "image"],
  artists: ["name", "image"],
  concerts: ["name", "date", "date_precision", "end_date", "venue_id", "artist_id", "supporting_artist_ids", "setlist_fm_url"],
  schedules: ["sets"],
  users: ["user_id", "username"],
  user_concerts: ["user_id", "concert_id", "supporting_artist_ids", "removed", "notes", "ticket_status", "seen_set_ids"],
};
const retired = {
  venues: [], artists: [], concerts: ["import_source", "status"],
  schedules: [], users: ["display_name"], user_concerts: [],
};

/** Pure, fail-closed preparation. Caller must save the unmodified source before writing. */
export interface CleanupOptions { confirmedFestivalDates?: Record<string, { start: string; end: string }> }
export function cleanSchema(source: TableBackup | LegacyBackup, options: CleanupOptions = {}): TableBackup {
  const result = Object.fromEntries(tableNames.map(table => [table, Object.fromEntries(Object.entries((source as TableBackup)[table] || {}).map(([id, value]) => {
    const unknown = Object.keys(value).filter(key => ![...fields[table], ...retired[table]].includes(key));
    if (unknown.length) throw new Error(`Review unknown fields in ${table}/${id}: ${unknown.join(", ")}`);
    return [id, Object.fromEntries(Object.entries(value).filter(([key]) => fields[table].includes(key)))];
  }))])) as TableBackup;
  const requireRef = (table: keyof TableBackup, id: unknown, context: string) => {
    if (id && (typeof id !== "string" || !Object.hasOwn(result[table], id))) throw new Error(`Broken ${table} reference in ${context}`);
  };
  const cancelled = Object.entries(source.concerts).filter(([, concert]) => concert.status === "cancelled");
  if (Object.values(source.concerts).some(concert => concert.status && concert.status !== "cancelled")) throw new Error("Review unrecognized legacy concert status");
  if (cancelled.length) {
    const owners = [...new Set(Object.values(result.users).map(profile => profile.user_id))];
    if (owners.length !== 1 || typeof owners[0] !== "string" || !owners[0]) throw new Error("Select the owner of legacy cancellations before cleanup");
    for (const [id] of cancelled) {
      const key = `${owners[0]}_${id}`;
      const existing = result.user_concerts[key];
      if (existing && Object.hasOwn(existing, "ticket_status") && existing.ticket_status !== "cancelled")
        throw new Error(`Review conflicting cancellation and personal ticket status: ${id}`);
      result.user_concerts[key] = { ...result.user_concerts[key], user_id: owners[0], concert_id: id, ticket_status: "cancelled" };
    }
  }
  for (const [id, concert] of Object.entries(result.concerts)) {
    requireRef("venues", concert.venue_id, id);
    for (const artist of [concert.artist_id, ...(concert.supporting_artist_ids || [])]) requireRef("artists", artist, id);
  }
  for (const [id, festival] of Object.entries("festivals" in source ? source.festivals : {})) {
    const unknown = Object.keys(festival).filter(key => !["name", "concert_ids", "start_date", "end_date"].includes(key));
    if (unknown.length) throw new Error(`Review unknown fields in festivals/${id}: ${unknown.join(", ")}`);
    const ids = festival.concert_ids || [];
    for (const cid of ids) requireRef("concerts", cid, id);
    if (ids.length !== 1) throw new Error(`Review festival ${id}: expected exactly one existing concert`);
    const concert = result.concerts[ids[0]];
    if (!festival.name || (concert.name && concert.name !== festival.name)) throw new Error(`Review conflicting festival name: ${id}`);
    concert.name = festival.name;
    if (!festival.start_date && !festival.end_date) continue;
    // Retire duplicated festival dates only when the concerts already preserve the range.
    const startById = Object.fromEntries(ids.map((cid: string) => {
      const concert = result.concerts[cid];
      const iso = timestampISO(concert.date);
      return [cid, concert.date_precision === "day" ? iso.slice(0, 10) : DateTime.fromISO(iso).setZone(result.venues[concert.venue_id]?.timezone || "UTC").toISODate()];
    }));
    const starts = Object.values(startById).sort();
    const ends = ids.map((cid: string) => result.concerts[cid].end_date || startById[cid]).sort();
    const confirmed = options.confirmedFestivalDates?.[id];
    const confirmedMatches = confirmed && confirmed.start === starts[0] && confirmed.end === ends.at(-1);
    if (!confirmedMatches && ((festival.start_date && festival.start_date !== starts[0]) || (festival.end_date && festival.end_date !== ends.at(-1)))) throw new Error(`Preserve the date range for festival ${id} before cleanup`);
  }
  for (const [id, schedule] of Object.entries(result.schedules)) {
    requireRef("concerts", id, id);
    const sets = Object.entries(schedule.sets || {}).map(([id, set]) => ({ ...(set as Omit<ScheduledSet, "id">), id }));
    validateSchedule(sets, normalizeConcert(id, result.concerts[id]), result.venues[result.concerts[id].venue_id]?.timezone || "");
  }
  const users = new Set(Object.values(result.users).map(profile => profile.user_id));
  const identities = new Set<string>();
  for (const [id, log] of Object.entries(result.user_concerts)) {
    requireRef("concerts", log.concert_id, id);
    if (!users.has(log.user_id) || !log.concert_id) throw new Error(`Invalid log owner or concert: ${id}`);
    if (id !== `${log.user_id}_${log.concert_id}`) throw new Error(`Review noncanonical log ID: ${id}`);
    const identity = `${log.user_id}_${log.concert_id}`;
    if (identities.has(identity)) throw new Error(`Duplicate user log: ${id}`);
    identities.add(identity);
    for (const artist of log.supporting_artist_ids || []) requireRef("artists", artist, id);
    if (log.ticket_status !== undefined && !isTicketStatus(log.ticket_status)) throw new Error(`Invalid ticket status: ${id}`);
    for (const set of log.seen_set_ids || []) {
      if (!Object.hasOwn(result.schedules[log.concert_id]?.sets || {}, set)) throw new Error(`Invalid selected set: ${id}`);
    }
    if (!log.seen_set_ids?.length && !log.removed && !log.notes?.trim() && !log.supporting_artist_ids?.length && !log.ticket_status) delete result.user_concerts[id];
  }
  return result;
}
