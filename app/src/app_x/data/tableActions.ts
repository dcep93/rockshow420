import { runTransaction, Timestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { collections, isTicketStatus, normalizeConcert } from "./model";
import type { Catalog, EntityKind, TicketStatus, ScheduledSet } from "./model";
import { isCalendarDate, isTimezone, toLocalInput } from "./time";
import { isDefaultLog } from "./logChanges";
import { validateSchedule } from "./schedules";
import { shortId } from "./ids";
import { record, transactionTables } from "./tables";
import type { TableName } from "./tables";

const allowedFields = {
  venue: ["name", "timezone", "location", "image"],
  artist: ["name", "image"],
  concert: ["name", "date", "date_precision", "end_date", "venue_id", "artist_id", "supporting_artist_ids", "setlist_fm_url"],
};
export type LogPatch = Partial<{ notes: string; supporting_artist_ids: string[]; removed: boolean; ticket_status: TicketStatus; seen_set_ids: string[] }>;
function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
}
function requireIDs(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id || id.includes("/")))
    throw new Error(`${field} must contain valid IDs.`);
}
function validateURL(value: unknown, field: string, setlist = false) {
  if (value === undefined || value === "") return;
  if (typeof value !== "string") throw new Error(`${field} must be a URL.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:" || (setlist && !["setlist.fm", "www.setlist.fm"].includes(url.hostname)))
    throw new Error(`${field} must be ${setlist ? "an HTTPS setlist.fm" : "an HTTPS"} URL.`);
}
async function requireReference(tables: ReturnType<typeof transactionTables>, name: TableName, id: string) {
  const data = record(await tables.read(name), id);
  if (id.includes("/") || !data) throw new Error("A selected record no longer exists. Refresh and choose again.");
  return data;
}

export function createTableActions(db: Firestore) {
async function saveEntity(
  kind: EntityKind,
  id: string | null,
  fields: Record<string, unknown>,
): Promise<string> {
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => allowedFields[kind].includes(key) && value !== undefined),
  );
  const collision = new Error("Could not allocate an unused ID. Please try again.");
  for (let attempt = 0; attempt < 5; attempt++) {
    const recordId = id || shortId();
    const name = collections[kind];
    try {
      await runTransaction(db, async (transaction) => {
        const tables = transactionTables(db, transaction);
        const existing = record(await tables.read(name), recordId);
        if (!id && existing) throw collision;
        if (id && !existing) throw new Error("This record has been deleted. Refresh before editing.");
        const data = { ...existing, ...patch };
        if (kind !== "concert") requireText(data.name, "Name");
        if (kind === "venue") {
          requireText(data.timezone, "Timezone");
          if (!isTimezone(data.timezone)) throw new Error("Choose a valid IANA timezone.");
        }
        if (kind === "venue" || kind === "artist") validateURL(data.image, "Image");
        if (kind === "concert") {
          if (!data.artist_id) requireText(data.name, "Name or headliner");
          if (data.date_precision !== undefined && !["day", "time"].includes(String(data.date_precision))) throw new Error("Invalid date precision.");
          if (data.date_precision !== "day") requireText(data.venue_id, "Venue for a timed concert");
          requireIDs(data.supporting_artist_ids ?? [], "Supporting artists");
          validateURL(data.setlist_fm_url, "Setlist", true);
          const [venue] = await Promise.all([
            data.venue_id ? requireReference(tables, "venues", String(data.venue_id)) : Promise.resolve(undefined),
            ...(data.artist_id ? [requireReference(tables, "artists", String(data.artist_id))] : []),
            ...((data.supporting_artist_ids as string[]) ?? []).map((artist) =>
              requireReference(tables, "artists", artist),
            ),
          ]);
          const date =
            data.date instanceof Timestamp
              ? data.date.toDate()
              : typeof data.date === "string"
                ? new Date(data.date)
                : new Date(NaN);
          if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid concert date and time.");
          const startDay = data.date_precision === "day" ? date.toISOString().slice(0, 10) : toLocalInput(date.toISOString(), String(venue?.timezone || "")).slice(0, 10);
          if (data.end_date && (!startDay || typeof data.end_date !== "string" || !isCalendarDate(data.end_date) || data.end_date < startDay)) throw new Error("End date must be on or after the start date.");
          const schedule = record(await tables.read("schedules"), recordId);
          if (schedule) validateSchedule(Object.entries(schedule.sets || {}).map(([id, set]) => ({ ...(set as Omit<ScheduledSet, "id">), id })), normalizeConcert(recordId, data), String(venue?.timezone || ""));
          if ("date" in patch) patch.date = Timestamp.fromDate(date);
        }
        tables.put(name, recordId, { ...existing, ...patch });
      });
      return recordId;
    } catch (error) {
      if (error !== collision) throw error;
    }
  }
  throw collision;
}

async function deleteEntity(kind: EntityKind, id: string, catalog: Catalog): Promise<void> {
  const inUse =
    kind === "venue"
      ? catalog.concerts.some((concert) => concert.venue_id === id)
      : kind === "artist"
        ? catalog.concerts.some(
            (concert) => concert.artist_id === id || concert.supporting_artist_ids.includes(id),
          ) || catalog.logs.some((log) => log.supporting_artist_ids.includes(id))
        : kind === "concert"
          ? catalog.logs.some((log) => log.concert_id === id) ||
            catalog.schedules.some((schedule) => schedule.id === id)
          : false;
  if (inUse) throw new Error("This record is still referenced. Remove its references before deleting it.");
  await runTransaction(db, async transaction => {
    const tables = transactionTables(db, transaction);
    await tables.read(collections[kind]);
    // Recheck references against the transaction snapshot, not the rendered catalog.
    const [concerts, schedules, logs] = await Promise.all([tables.read("concerts"), tables.read("schedules"), tables.read("user_concerts")]);
    const used = kind === "venue" ? Object.values(concerts).some(c => c.venue_id === id)
      : kind === "artist" ? Object.values(concerts).some(c => c.artist_id === id || (c.supporting_artist_ids ?? []).includes(id)) || Object.values(logs).some(l => (l.supporting_artist_ids ?? []).includes(id))
      : kind === "concert" ? Object.values(logs).some(l => l.concert_id === id) || Object.hasOwn(schedules, id) : false;
    if (used) throw new Error("This record is still referenced. Remove its references before deleting it.");
    tables.put(collections[kind], id, null);
  });
}

async function saveLog(
  uid: string,
  concertId: string,
  fields: LogPatch,
  restore = false,
): Promise<void> {
  if (fields.ticket_status !== undefined && !isTicketStatus(fields.ticket_status)) throw new Error("Choose a valid ticket status.");
  if (fields.notes !== undefined && typeof fields.notes !== "string") throw new Error("Notes must be text.");
  const id = `${uid}_${concertId}`;
  await runTransaction(db, async (transaction) => {
    const tables = transactionTables(db, transaction);
    const concert = record(await tables.read("concerts"), concertId);
    const existing = record(await tables.read("user_concerts"), id);
    if (!concert) throw new Error("This concert no longer exists.");
    if (existing?.removed === true && !restore && fields.removed === false)
      throw new Error("This concert is hidden. Unhide it before saving a visible entry.");
    const lineup: string[] = concert.supporting_artist_ids ?? [];
    const support = fields.supporting_artist_ids ?? (existing?.supporting_artist_ids ?? []).filter((id: string) => lineup.includes(id));
    requireIDs(support, "Supporting artists");
    if (support.some((artist: string) => !lineup.includes(artist)))
      throw new Error("Supporting artists must belong to the concert lineup.");
    const schedule = record(await tables.read("schedules"), concertId);
    const seen = fields.seen_set_ids ?? (existing?.seen_set_ids ?? []).filter((id: string) => Object.hasOwn(schedule?.sets || {}, id));
    requireIDs(seen, "Seen sets");
    if (seen.some((set: string) => !Object.hasOwn(schedule?.sets || {}, set))) throw new Error("Selected sets must belong to this concert schedule.");
    const patch = {
      seen_set_ids: [...new Set(seen)],
      removed: fields.removed ?? existing?.removed ?? false,
      notes: fields.notes ?? existing?.notes ?? "",
      supporting_artist_ids: [...new Set(support)],
      ticket_status: fields.ticket_status ?? existing?.ticket_status ?? "",
    };
    if (isDefaultLog({ ...existing, ...patch })) {
      if (existing) tables.put("user_concerts", id, null);
    } else tables.put("user_concerts", id, { ...existing, user_id: uid, concert_id: concertId, ...patch });
  });
}

async function saveSchedule(concertId: string, sets: ScheduledSet[]): Promise<void> {
  await runTransaction(db, async transaction => {
    const tables = transactionTables(db, transaction);
    const concert = record(await tables.read("concerts"), concertId);
    if (!concert) throw new Error("This concert no longer exists.");
    const venue = record(await tables.read("venues"), concert.venue_id || "");
    const existing = record(await tables.read("schedules"), concertId);
    const logs = await tables.read("user_concerts");
    validateSchedule(sets, normalizeConcert(concertId, concert), venue?.timezone || "");
    const byId = Object.fromEntries(sets.map(({ id, ...set }) => [id, set]));
    for (const log of Object.values(logs).filter(log => log.concert_id === concertId)) {
      for (const id of log.seen_set_ids || []) {
        if (!byId[id] || byId[id].artist_id !== existing?.sets?.[id]?.artist_id)
          throw new Error("A selected set cannot be removed or reassigned to another artist.");
      }
      if (!existing?.sets || !Object.keys(existing.sets).length) {
        if (sets.length && log.supporting_artist_ids?.length)
          throw new Error("Existing artist selections need review before adding a schedule.");
      }
    }
    if (sets.length) tables.put("schedules", concertId, { ...existing, sets: byId });
    else if (existing) tables.put("schedules", concertId, null);
  });
}
return { saveEntity, deleteEntity, saveLog, saveSchedule };
}
