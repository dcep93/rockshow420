/** GitHub-only catalog enrichment, after uploading the prepare step's backup. */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";
import { projectRevisions, type CatalogCorrections } from "../data/catalogCorrections";
import { tableNames } from "../data/tables";
import type { TableBackup } from "../data/migrateTables";
import { adminRest, decode, encode, records, type FirestoreDocument } from "./firestoreRest";

const work = process.env.CUTOVER_BACKUP_DIR;
if (!work || process.env.GITHUB_ACTIONS !== "true" || process.env.CUTOVER_BACKUP_UPLOADED !== "true") throw new Error("Catalog updates require GitHub's uploaded fresh backup");
const directory = new URL("../imports/", import.meta.url);
const files = (await readdir(directory)).filter(name => /^catalog-corrections-.*\.json$/.test(name)).sort();
const revisions = await Promise.all(files.map(async file => {
  const source = await readFile(new URL(file, directory), "utf8");
  return { patch: JSON.parse(source) as CatalogCorrections, hash: createHash("sha256").update(source).digest("hex") };
}));
const api = await adminRest();
const docs = await api.list("tables");
const envelopes = records(docs);
if (docs.length !== 6 || tableNames.some(name => envelopes[name]?.schema_version !== 1)) throw new Error("Catalog correction requires six migrated tables");
const applied = envelopes.concerts.applied_revisions || {};
const current = Object.fromEntries(tableNames.map(name => [name, envelopes[name].records])) as TableBackup;
const { prepared, receipts, pending } = projectRevisions(current, revisions, applied);
if (!pending.length) {
  console.log("Catalog enrichment already applied; subsequent user edits preserved.");
  process.exit(0);
}
const archived = JSON.parse(await readFile(`${work}/prepared-raw.json`, "utf8"));
if (!archived.tables) throw new Error("Run a fresh deployment after the initial migration before applying catalog corrections");
const changed = tableNames.filter(name => name === "concerts" || !equal(prepared[name], current[name]));
const writes = changed.map(name => {
  const doc = docs.find(item => item.name.endsWith(`/tables/${name}`))!;
  const backup = archived.tables.find((item: FirestoreDocument) => item.name === doc.name);
  if (!backup || !equal(backup, doc)) throw new Error(`Table ${name} changed after backup; rerun deployment`);
  const value = decode({ mapValue: { fields: doc.fields } });
  value.records = prepared[name];
  if (name === "concerts") value.applied_revisions = receipts;
  return { update: { name: doc.name, fields: encode(value).mapValue.fields }, currentDocument: { updateTime: doc.updateTime } };
});
await api.request(":commit", { writes });
const verified = records(await api.list("tables"));
for (const name of changed) if (!equal(verified[name].records, prepared[name])) throw new Error(`Catalog correction readback mismatch: ${name}`);
if (!equal(verified.concerts.applied_revisions, receipts)) throw new Error("Missing catalog revision receipt");
const summaries = pending.map(({ patch, hash }) => ({ id: patch.id, hash, added_concerts: patch.concert_additions?.length || 0,
  added_sets: patch.lineup_additions.length + (patch.concert_additions || []).reduce((count, item) => count + Object.keys(item.schedule?.sets || {}).length, 0),
  updated_concerts: patch.concert_updates.length, updated_artists: patch.artist_updates?.length || 0, updated_venues: patch.venue_updates?.length || 0 }));
await writeFile(`${work}/catalog-corrections-verified.json`, JSON.stringify({ revisions: summaries, changed, verified_at: new Date().toISOString() }, null, 2));
console.log(`Verified catalog revisions: ${JSON.stringify(summaries)}`);
