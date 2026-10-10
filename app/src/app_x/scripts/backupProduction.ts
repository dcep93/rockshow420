/** Read-only deployment preflight. Never creates, migrates or deletes data. */
import { mkdir, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { cleanSchema } from "../data/cleanSchema";
import { tableNames } from "../data/tables";
import type { TableBackup } from "../data/migrateTables";
import { adminRest, records } from "./firestoreRest";

const work = process.env.CUTOVER_BACKUP_DIR;
if (!work) throw new Error("CUTOVER_BACKUP_DIR is required");
const api = await adminRest();
const tables = await api.list("tables");
const envelopes = records(tables);
if (tables.length !== tableNames.length || tableNames.some(name => envelopes[name]?.schema_version !== 1)) {
  throw new Error("Expected all six migrated tables; deployment stopped without changing data");
}
const current = Object.fromEntries(tableNames.map(name => [name, envelopes[name].records])) as TableBackup;
if (!isDeepStrictEqual(cleanSchema(current), current)) throw new Error("Unexpected table schema; deployment stopped without changing data");
await mkdir(work, { recursive: true });
await writeFile(`${work}/prepared-raw.json`, JSON.stringify({ fetched_at: new Date().toISOString(), collections: { tables } }, null, 2), { flag: "wx", mode: 0o600 });
console.log(JSON.stringify({ counts: Object.fromEntries(tableNames.map(name => [name, Object.keys(current[name]).length])) }));
