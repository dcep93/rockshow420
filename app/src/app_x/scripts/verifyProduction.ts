/** Verify the deployed release and six public tables before legacy retirement. */
import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isDeepStrictEqual as equal } from "node:util";
import { cleanSchema } from "../data/cleanSchema";
import { tableNames } from "../data/tables";
import type { TableBackup } from "../data/migrateTables";
import { decode, documentRoot } from "./firestoreRest";

const work = process.env.CUTOVER_BACKUP_DIR;
if (!work) throw new Error("CUTOVER_BACKUP_DIR is required");
const expectedHtml = await readFile(new URL("../../../dist/index.html", import.meta.url), "utf8");
const response = await fetch(`https://rockshow420.web.app/?release=${process.env.GITHUB_SHA || Date.now()}`, { cache: "no-store" });
if (!response.ok || await response.text() !== expectedHtml) throw new Error("Hosting does not serve the built release; legacy data retained");
const assets = await readdir(new URL("../../../dist/assets/", import.meta.url));
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
for (const asset of assets) {
  const expected = await readFile(new URL(`../../../dist/assets/${asset}`, import.meta.url));
  const response = await fetch(`https://rockshow420.web.app/assets/${encodeURIComponent(asset)}`);
  if (!response.ok || hash(new Uint8Array(await response.arrayBuffer())) !== hash(expected)) throw new Error(`Deployed asset mismatch: ${asset}; legacy data retained`);
}
const tables = {} as TableBackup;
for (const name of tableNames) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${documentRoot}/tables/${name}`);
  if (!response.ok) throw new Error(`Public ${name} read failed: ${response.status}`);
  const envelope = decode({ mapValue: { fields: (await response.json()).fields } });
  if (envelope.schema_version !== 1) throw new Error(`Invalid schema for ${name}`);
  tables[name] = envelope.records;
}
if (!equal(cleanSchema(tables), tables)) throw new Error("Public schema contains legacy/default records");
if (!tables.users.dcep93 || Object.keys(tables.concerts).length < 354 || Object.keys(tables.schedules).length < 14) throw new Error("Required catalog data missing");
const report = { verified_at: new Date().toISOString(), commit: process.env.GITHUB_SHA, assets_verified: assets.length, html_sha256: createHash("sha256").update(expectedHtml).digest("hex"), counts: Object.fromEntries(tableNames.map(name => [name, Object.keys(tables[name]).length])) };
await writeFile(`${work}/hosting-verified.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
