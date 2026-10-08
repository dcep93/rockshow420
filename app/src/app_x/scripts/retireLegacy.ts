/** GitHub-only cleanup after backup upload and verification of matching Hosting. */
import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual as equal } from "node:util";
import { legacyTableNames } from "../data/migrateTables";
import { tableNames } from "../data/tables";
import { adminRest, records, type FirestoreDocument } from "./firestoreRest";

if (process.env.GITHUB_ACTIONS !== "true" || process.env.CUTOVER_BACKUP_UPLOADED !== "true" || !process.env.CUTOVER_BACKUP_DIR) throw new Error("Retirement requires the verified GitHub release and uploaded backup");
const work = process.env.CUTOVER_BACKUP_DIR;
const release = JSON.parse(await readFile(`${work}/hosting-verified.json`, "utf8"));
if (!process.env.GITHUB_SHA || release.commit !== process.env.GITHUB_SHA) throw new Error("Release verification does not match this commit");
const backup = JSON.parse(await readFile(`${work}/prepared-raw.json`, "utf8"));
const api = await adminRest();
const active = records(await api.list("tables"));
if (tableNames.some(name => active[name]?.schema_version !== 1)) throw new Error("Incomplete active tables; retain legacy data");
const legacy = Object.fromEntries(await Promise.all(legacyTableNames.map(async name => [name, await api.list(name)]))) as Record<string, FirestoreDocument[]>;
for (const name of legacyTableNames) if (!equal(legacy[name], backup.collections[name])) throw new Error(`Legacy ${name} changed after archival; retain and review`);
const documents = Object.values(legacy).flat();
for (let offset = 0; offset < documents.length; offset += 400) {
  await api.request(":commit", { writes: documents.slice(offset, offset + 400).map(doc => ({ delete: doc.name, currentDocument: { updateTime: doc.updateTime } })) });
}
for (const name of legacyTableNames) if ((await api.list(name)).length) throw new Error(`Legacy collection ${name} remains`);
await writeFile(`${work}/retirement-verified.json`, JSON.stringify({ verified_at: new Date().toISOString(), commit: process.env.GITHUB_SHA, deleted_legacy_documents: documents.length }, null, 2));
console.log(`Legacy cleanup verified: ${documents.length} archived documents retired.`);
