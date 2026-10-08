/** Apply reviewed manifest corrections to the local emulator, preserving attendance. */
import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual as equal } from "node:util";
import { cleanSchema } from "../data/cleanSchema";
import { tableNames } from "../data/tables";
import type { TableBackup } from "../data/migrateTables";
import { decode, encode, records, type Raw, type FirestoreDocument } from "../scripts/firestoreRest";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const beforeIndex = args.indexOf("--before-manifest");
const beforePath = beforeIndex >= 0 ? args[beforeIndex + 1] : undefined;
if ((beforeIndex >= 0 && (!beforePath || beforePath.startsWith("--"))) || args.some((arg, index) => arg !== "--apply" && arg !== "--before-manifest" && !(beforeIndex >= 0 && index === beforeIndex + 1))) throw new Error("Usage: tsx reconcileFestivalImport.ts [--apply] [--before-manifest path]");
const work = "/Users/danielcepeda/repos/_codex_output/rockshow420/festival-gap-review-2026-10-08";
const before = JSON.parse(await readFile(beforePath || `${work}/manifest-before-gap-corrections.json`, "utf8"));
const after = JSON.parse(await readFile(new URL("festival-lineups-2026-10-08.json", import.meta.url), "utf8"));
const base = "http://127.0.0.1:8080/v1/projects/demo-rockshow420/databases/(default)/documents";
async function request(path: string, body?: Raw) {
  const result = await fetch(base + path, { method: body ? "POST" : "GET", headers: { Authorization: "Bearer owner", "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!result.ok) throw new Error(`Local emulator HTTP ${result.status}: ${await result.text()}`);
  return result.json();
}
const snapshot = await request("/tables?pageSize=100");
const docs = new Map<string, FirestoreDocument>(snapshot.documents.map((doc: FirestoreDocument) => [doc.name.split("/").at(-1), doc]));
const envelopes = records(snapshot.documents);
if (tableNames.some(name => envelopes[name]?.schema_version !== 1)) throw new Error("Missing table");
const tables = Object.fromEntries(tableNames.map(name => [name, envelopes[name].records])) as TableBackup;
const original = Object.fromEntries(tableNames.map(name => [name, decode({ mapValue: { fields: docs.get(name)!.fields } }).records])) as TableBackup;
for (const festival of after.festivals) {
  const previous = before.festivals.find((item: Raw) => item.concert_id === festival.concert_id);
  const id = festival.concert_id;
  const schedule = (item: Raw) => ({ sets: Object.fromEntries(item.sets.map(({ id, ...set }: Raw) => [id, set])) });
  if (!previous || (!equal(tables.schedules[id], schedule(previous)) && !equal(tables.schedules[id], schedule(festival)))) throw new Error(`Schedule ${id} was edited; reconcile manually`);
  for (const [key, value] of Object.entries(festival.concert_patch)) {
    if (!equal(tables.concerts[id][key], previous.concert_patch[key]) && !equal(tables.concerts[id][key], value)) throw new Error(`Concert ${id}.${key} changed`);
    tables.concerts[id][key] = value;
  }
  tables.schedules[id] = schedule(festival);
}
for (const [id, item] of Object.entries(after.artists)) {
  if (tables.artists[id] && !equal(tables.artists[id], item)) throw new Error(`Artist ${id} changed`);
  tables.artists[id] ||= item as Raw;
}
for (const id of Object.keys(before.artists).filter(id => !after.artists[id])) {
  if (tables.artists[id] && !equal(tables.artists[id], before.artists[id])) throw new Error(`Artist ${id} changed`);
  if (Object.values(tables.concerts).some(concert => concert.artist_id === id || concert.supporting_artist_ids?.includes(id))) throw new Error(`Artist ${id} still referenced`);
  if (Object.values(tables.user_concerts).some(log => log.supporting_artist_ids?.includes(id))) throw new Error(`Artist ${id} selected`);
  delete tables.artists[id];
}
if (!equal(cleanSchema(tables), tables)) throw new Error("Corrections would change personal defaults or invalid data");
const changed = tableNames.filter(name => !equal(tables[name], original[name]));
console.log(JSON.stringify({ changed, sets: Object.values(tables.schedules).reduce((sum, schedule) => sum + Object.keys(schedule.sets).length, 0) }));
if (apply && changed.length) {
  const backup = `${work}/before-local-corrections-${Date.now()}.json`;
  await writeFile(backup, JSON.stringify(snapshot, null, 2), { flag: "wx" });
  const writes = tableNames.map(name => changed.includes(name)
    ? { update: { name: docs.get(name)!.name, fields: { ...docs.get(name)!.fields, records: encode(tables[name]) } }, currentDocument: { updateTime: docs.get(name)!.updateTime } }
    : { verify: docs.get(name)!.name, currentDocument: { updateTime: docs.get(name)!.updateTime } });
  await request(":commit", { writes });
  const verified = records((await request("/tables?pageSize=100")).documents);
  for (const name of tableNames) if (!equal(verified[name].records, tables[name])) throw new Error(`Verification failed: ${name}`);
  console.log(`Verified local corrections. Backup: ${backup}`);
} else console.log(changed.length ? "Dry run; no writes." : "Already reconciled; no writes.");
