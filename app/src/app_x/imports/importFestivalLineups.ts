/** Local-only, repeatable import. Run with tsx; dry run unless --apply is passed. */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { normalizeConcert, type ScheduledSet } from "../data/model";
import { validateSchedule } from "../data/schedules";

type Raw = Record<string, any>;
type Value = { mapValue?: { fields?: Record<string, Value> }; arrayValue?: { values?: Value[] }; [type: string]: unknown };
type Document = { name: string; fields: Record<string, Value>; updateTime: string };
type Festival = { concert_id: string; name: string; expected_concert: Raw; concert_patch: Raw; sets: ScheduledSet[] };
type Manifest = { version: number; artists: Record<string, Raw>; venues: Record<string, Raw>; festivals: Festival[] };
const root = dirname(fileURLToPath(import.meta.url));
const base = "http://127.0.0.1:8080/v1/projects/demo-concertboxd/databases/(default)/documents";
const tableNames = ["artists", "venues", "concerts", "schedules", "users", "user_concerts"];
const args = process.argv.slice(2);
if (args.some(arg => arg !== "--apply")) throw new Error("Usage: tsx importFestivalLineups.ts [--apply]. This importer only targets the local demo emulator.");
const apply = args.includes("--apply");
const manifest: Manifest = JSON.parse(await readFile(resolve(root, "festival-lineups-2026-10-08.json"), "utf8"));
if (manifest.version !== 1) throw new Error("Unsupported manifest version");
function decode(value: Value): any {
  if (value.mapValue) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, child]) => [key, decode(child)]));
  if (value.arrayValue) return (value.arrayValue.values || []).map(decode);
  if ("integerValue" in value) return Number(value.integerValue);
  for (const key of ["stringValue", "timestampValue", "booleanValue", "doubleValue", "nullValue"]) if (key in value) return value[key];
  throw new Error("Unsupported Firestore value");
}
function encode(value: any): Value {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === "object") return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encode(child)])) } };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") return { integerValue: String(value) };
  throw new Error("Unsupported import value");
}
async function request(url: string, body?: unknown) {
  const response = await fetch(url, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Local emulator HTTP ${response.status}: ${await response.text()}`);
  return response.json();
}
const snapshot = await request(`${base}/tables?pageSize=100`);
const docs = new Map<string, Document>((snapshot.documents || []).map((doc: Document) => [doc.name.split("/").at(-1)!, doc]));
const tables: Record<string, Raw> = {};
for (const name of tableNames) {
  const doc = docs.get(name);
  if (!doc) throw new Error(`Missing local table ${name}. Restore the catalog before importing.`);
  const data = decode({ mapValue: { fields: doc.fields } });
  if (data.schema_version !== 1 || !data.records) throw new Error(`Invalid local table ${name}`);
  tables[name] = data.records;
}
const changes = new Map<string, { records: Raw; paths: string[] }>();
const quote = (key: string) => `\`${key.replaceAll("\\", "\\\\").replaceAll("`", "\\`")}\``;
function change(table: string, id: string, data: Raw, fields?: string[]) {
  const patch = changes.get(table) || { records: {}, paths: [] };
  patch.records[id] = data;
  patch.paths.push(...(fields ? fields.map(field => `records.${quote(id)}.${quote(field)}`) : [`records.${quote(id)}`]));
  changes.set(table, patch);
  tables[table][id] = fields ? { ...tables[table][id], ...data } : data;
}
for (const table of ["artists", "venues"] as const) {
  for (const [id, data] of Object.entries(manifest[table])) {
    const existing = tables[table][id];
    if (existing) {
      for (const [key, value] of Object.entries(data)) if (!isDeepStrictEqual(existing[key], value)) throw new Error(`Conflicting ${table}/${id}.${key}; review instead of overwriting.`);
    } else change(table, id, data);
  }
}
const concertIds = new Set<string>();
const setIds = new Set<string>();
for (const festival of manifest.festivals) {
  const id = festival.concert_id;
  if (concertIds.has(id)) throw new Error(`Duplicate festival ${id}`);
  concertIds.add(id);
  const existing = tables.concerts[id];
  if (!existing) throw new Error(`Missing concert ${id}`);
  for (const [key, expected] of Object.entries(festival.expected_concert)) {
    if (!isDeepStrictEqual(existing[key] ?? null, expected) && !isDeepStrictEqual(existing[key], festival.concert_patch[key])) throw new Error(`Concert ${id}.${key} changed since research; reconcile first.`);
  }
  const lineup = festival.concert_patch.supporting_artist_ids as string[];
  if (new Set(lineup).size !== lineup.length || lineup.some(artist => !tables.artists[artist])) throw new Error(`Invalid lineup ${id}`);
  if ((existing.supporting_artist_ids || []).some((artist: string) => !lineup.includes(artist))) throw new Error(`Import would remove an existing artist from ${id}`);
  const concert = { ...existing, ...festival.concert_patch };
  for (const set of festival.sets) {
    if (setIds.has(set.id)) throw new Error(`Duplicate set ID ${set.id}`);
    setIds.add(set.id);
    if (Object.keys(set).some(key => !["id", "artist_id", "day", "start", "end", "stage"].includes(key))) throw new Error(`Unexpected set data ${set.id}`);
    if (!tables.artists[set.artist_id]) throw new Error(`Missing artist ${set.artist_id}`);
  }
  validateSchedule(festival.sets, normalizeConcert(id, concert), tables.venues[concert.venue_id]?.timezone || "");
  const schedule = { sets: Object.fromEntries(festival.sets.map(({ id: setId, ...set }) => [setId, set])) };
  const saved = tables.schedules[id];
  if (saved && !isDeepStrictEqual(saved, schedule)) throw new Error(`Existing schedule ${id} differs; reconcile stable set IDs before importing.`);
  if (!saved) {
    const personal = Object.values(tables.user_concerts).filter(log => log.concert_id === id);
    if (personal.some(log => (log.supporting_artist_ids || []).length || (log.seen_set_ids || []).length)) throw new Error(`Concert ${id} has personal artist selections; preserve them explicitly before importing.`);
    change("schedules", id, schedule);
  }
  const fields = Object.keys(festival.concert_patch).filter(key => !isDeepStrictEqual(existing[key], festival.concert_patch[key]));
  if (fields.length) change("concerts", id, Object.fromEntries(fields.map(key => [key, festival.concert_patch[key]])), fields);
}
const sizes = Object.fromEntries(tableNames.map(name => [name, Buffer.byteLength(JSON.stringify({ schema_version: 1, records: tables[name] }))]));
if (Object.values(sizes).some(size => size > 850_000)) throw new Error("A table is approaching Firestore's document limit");
const summary = { festivals: manifest.festivals.length, sets: setIds.size, timed_sets: manifest.festivals.flatMap(festival => festival.sets).filter(set => set.start).length, changed_records: Object.fromEntries([...changes].map(([table, patch]) => [table, Object.keys(patch.records).length])), table_bytes: sizes };
console.log(JSON.stringify(summary, null, 2));
if (!changes.size) {
  console.log("Already imported; no writes.");
} else if (!apply) {
  console.log("Dry run passed. Re-run with --apply to write the local emulator.");
} else {
  const backupDir = resolve(root, "../../../../../_codex_output/concertboxd/festival-import-2026-10-08");
  await mkdir(backupDir, { recursive: true });
  const backup = resolve(backupDir, `before-apply-${Date.now()}.json`);
  await writeFile(backup, JSON.stringify(snapshot, null, 2) + "\n", { flag: "wx" });
  const writes: Raw[] = [...changes].map(([table, patch]) => ({ update: { name: docs.get(table)!.name, fields: { records: encode(patch.records) } }, updateMask: { fieldPaths: patch.paths }, currentDocument: { updateTime: docs.get(table)!.updateTime } }));
  // Guard personal selections and all other read state against concurrent edits.
  for (const table of tableNames.filter(name => !changes.has(name))) writes.push({ verify: docs.get(table)!.name, currentDocument: { updateTime: docs.get(table)!.updateTime } });
  await request(`${base}:commit`, { writes });
  const after = await request(`${base}/tables?pageSize=100`);
  const afterDocs = new Map<string, Document>(after.documents.map((doc: Document) => [doc.name.split("/").at(-1)!, doc]));
  for (const table of ["users", "user_concerts"]) if (!isDeepStrictEqual(afterDocs.get(table)!.fields, docs.get(table)!.fields)) throw new Error(`Personal table ${table} changed concurrently; inspect backup ${backup}`);
  for (const name of tableNames) {
    const actual = decode({ mapValue: { fields: afterDocs.get(name)!.fields } }).records;
    if (!isDeepStrictEqual(actual, tables[name])) throw new Error(`Post-import verification failed for ${name}; inspect backup ${backup}`);
  }
  console.log(`Local import verified. Backup: ${backup}`);
}
