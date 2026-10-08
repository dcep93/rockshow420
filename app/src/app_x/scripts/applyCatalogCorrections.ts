/** GitHub-only catalog enrichment, after uploading the prepare step's backup. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";
import { projectCorrections, type CatalogCorrections } from "../data/catalogCorrections";
import { tableNames } from "../data/tables";
import type { TableBackup } from "../data/migrateTables";
import { adminRest, decode, encode, records, type FirestoreDocument } from "./firestoreRest";

const work = process.env.CUTOVER_BACKUP_DIR;
if (!work || process.env.GITHUB_ACTIONS !== "true" || process.env.CUTOVER_BACKUP_UPLOADED !== "true") throw new Error("Catalog updates require GitHub's uploaded fresh backup");
const source = await readFile(new URL("../imports/catalog-corrections-2026-10-08.json", import.meta.url), "utf8");
const patch: CatalogCorrections = JSON.parse(source);
const hash = createHash("sha256").update(source).digest("hex");
const api = await adminRest();
const docs = await api.list("tables");
const envelopes = records(docs);
if (docs.length !== 6 || tableNames.some(name => envelopes[name]?.schema_version !== 1)) throw new Error("Catalog correction requires six migrated tables");
const applied = envelopes.concerts.applied_revisions || {};
if (applied[patch.id]) {
  if (applied[patch.id] !== hash) throw new Error("Previously applied patch changed; create a new reviewed revision");
  console.log("Catalog enrichment already applied; subsequent user edits preserved.");
  process.exit(0);
}
const archived = JSON.parse(await readFile(`${work}/prepared-raw.json`, "utf8"));
if (!archived.tables) throw new Error("Run a fresh deployment after the initial migration before applying catalog corrections");
const current = Object.fromEntries(tableNames.map(name => [name, envelopes[name].records])) as TableBackup;
const prepared = projectCorrections(current, patch);
const changed = tableNames.filter(name => name === "concerts" || !equal(prepared[name], current[name]));
const writes = changed.map(name => {
  const doc = docs.find(item => item.name.endsWith(`/tables/${name}`))!;
  const backup = archived.tables.find((item: FirestoreDocument) => item.name === doc.name);
  if (!backup || !equal(backup, doc)) throw new Error(`Table ${name} changed after backup; rerun deployment`);
  const value = decode({ mapValue: { fields: doc.fields } });
  value.records = prepared[name];
  if (name === "concerts") value.applied_revisions = { ...applied, [patch.id]: hash };
  return { update: { name: doc.name, fields: encode(value).mapValue.fields }, currentDocument: { updateTime: doc.updateTime } };
});
await api.request(":commit", { writes });
const verified = records(await api.list("tables"));
for (const name of changed) if (!equal(verified[name].records, prepared[name])) throw new Error(`Catalog correction readback mismatch: ${name}`);
if (verified.concerts.applied_revisions?.[patch.id] !== hash) throw new Error("Missing catalog revision receipt");
await writeFile(`${work}/catalog-corrections-verified.json`, JSON.stringify({ id: patch.id, hash, changed, verified_at: new Date().toISOString(), added_sets: patch.lineup_additions.length, updated_concerts: patch.concert_updates.length }, null, 2));
console.log(`Verified ${patch.lineup_additions.length} added festival sets and ${patch.concert_updates.length} concert corrections.`);
