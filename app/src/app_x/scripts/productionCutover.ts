/** Run with tsx. Default: fresh backup and dry run. --apply: one-time cutover. */
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual as equal } from "node:util";
import { randomUUID } from "node:crypto";
import { cleanSchema } from "../data/cleanSchema";
import { legacyTableNames, validateTableSize, type LegacyBackup, type TableBackup } from "../data/migrateTables";
import { tableNames } from "../data/tables";
import { timestampISO } from "../data/model";
import { adminRest, decode, documentRoot, encode, records, type FirestoreDocument, type Raw } from "./firestoreRest";

const work = process.env.CUTOVER_BACKUP_DIR || "/Users/danielcepeda/repos/_codex_output/concertboxd/production-cutover-2026-10-08";
const args = process.argv.slice(2);
if (args.some(arg => !["--apply", "--offline"].includes(arg)) || (args.includes("--apply") && args.includes("--offline"))) throw new Error("Usage: tsx productionCutover.ts [--apply | --offline]");
const apply = args.includes("--apply");
const manifest = JSON.parse(await readFile(new URL("../imports/festival-lineups-2026-10-08.json", import.meta.url), "utf8"));
const options = { confirmedFestivalDates: { jucc7j: { start: "2021-07-29", end: "2021-08-01" } } };
await mkdir(work, { recursive: true });

function project(legacy: LegacyBackup): TableBackup {
  const cleaned = cleanSchema(legacy, options);
  const personal = { users: cleaned.users, user_concerts: cleaned.user_concerts };
  for (const name of ["artists", "venues"] as const) for (const [id, item] of Object.entries(manifest[name]) as [string, Raw][]) {
    if (cleaned[name][id] && !Object.entries(item).every(([key, value]) => equal(cleaned[name][id][key], value))) throw new Error(`Conflicting ${name}/${id}`);
    cleaned[name][id] ||= item;
  }
  for (const festival of manifest.festivals) {
    const id = festival.concert_id;
    const existing = cleaned.concerts[id];
    if (!existing) throw new Error(`Missing concert ${id}`);
    for (const [key, expected] of Object.entries(festival.expected_concert)) {
      const current = key === "date" ? timestampISO(existing[key]) : existing[key] ?? null;
      // ISO timestamp formatting is irrelevant; compare the actual instant.
      const same = key === "date" ? Date.parse(current) === Date.parse(expected as string) : equal(current, expected);
      if (!same && !equal(existing[key], festival.concert_patch[key])) throw new Error(`Concert ${id}.${key} changed since research`);
    }
    if (Object.values(cleaned.user_concerts).some(log => log.concert_id === id && (log.supporting_artist_ids?.length || log.seen_set_ids?.length))) throw new Error(`Preserve existing festival selections before migrating ${id}`);
    const lineup = festival.concert_patch.supporting_artist_ids;
    if ((existing.supporting_artist_ids || []).some((artist: string) => !lineup.includes(artist))) throw new Error(`Lineup would remove existing artist: ${id}`);
    cleaned.concerts[id] = { ...existing, ...festival.concert_patch };
    cleaned.schedules[id] = { sets: Object.fromEntries(festival.sets.map(({ id: setId, ...set }: Raw) => [setId, set])) };
  }
  const result = cleanSchema(cleaned);
  if (!equal(result.users, personal.users) || !equal(result.user_concerts, personal.user_concerts)) throw new Error("Festival import changed personal data");
  for (const name of tableNames) validateTableSize(result[name]);
  return result;
}

function summary(data: TableBackup) {
  return { counts: Object.fromEntries(tableNames.map(name => [name, Object.keys(data[name]).length])), table_bytes: Object.fromEntries(tableNames.map(name => [name, Buffer.byteLength(JSON.stringify(data[name]))])) };
}

if (args.includes("--offline")) {
  const raw = JSON.parse(await readFile(`${work}/production-preflight-raw.json`, "utf8"));
  const source = Object.fromEntries(legacyTableNames.map(name => [name, records(raw.collections[name])])) as LegacyBackup;
  const prepared = project(source);
  console.log(JSON.stringify({ offline: true, ...summary(prepared) }, null, 2));
  await writeFile(`${work}/projection-offline.json`, JSON.stringify(prepared, null, 2));
} else {
  const api = await adminRest();
  const destinations = await api.list("tables");
  if (destinations.length) {
    if (destinations.length !== 6 || destinations.some(doc => decode({ mapValue: { fields: doc.fields } }).schema_version !== 1)) throw new Error("Partial migration or lock exists: inspect before proceeding");
    const all = records(destinations);
    const current = Object.fromEntries(tableNames.map(name => [name, all[name]?.records])) as TableBackup;
    const checked = cleanSchema(current);
    if (!equal(checked, current)) throw new Error("Existing tables need cleanup; do not overwrite them");
    // Only publicly readable legacy data is archived in GitHub artifacts.
    // The restricted admins registry is never changed by this migration.
    const raw = Object.fromEntries(await Promise.all(legacyTableNames.map(async name => [name, await api.list(name)])));
    if (!apply) {
      await writeFile(`${work}/prepared-raw.json`, JSON.stringify({ fetched_at: new Date().toISOString(), collections: raw, tables: destinations }, null, 2), { mode: 0o600 });
      if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "migration_needed=false\n");
    }
    console.log(JSON.stringify({ already_migrated: true, ...summary(current) }, null, 2));
    process.exit(0);
  }
  let lock: FirestoreDocument | undefined;
  const archived = apply ? JSON.parse(await readFile(`${work}/prepared-raw.json`, "utf8")) : undefined;
  try {
    if (apply) {
      if (process.env.GITHUB_ACTIONS !== "true" || process.env.CUTOVER_BACKUP_UPLOADED !== "true") throw new Error("Production writes require the GitHub deployment job and its successful backup upload");
      const expectedRules = await readFile(new URL("../backend/firestore.migration.rules", import.meta.url), "utf8");
      if (!(await api.deployedRules()).some(content => content.trim() === expectedRules.trim())) throw new Error("Deploy and verify the migration-compatible rules before freezing production");
      // Exact rule comparison above ensures this freezes legacy client writes.
      lock = await api.request("/tables/concerts?currentDocument.exists=false", { fields: encode({ schema_version: 0, records: {}, migration_token: randomUUID() }).mapValue.fields }, "PATCH");
    }
    const raw = Object.fromEntries(await Promise.all(legacyTableNames.map(async name => [name, await api.list(name)]))) as Record<string, FirestoreDocument[]>;
    if (apply && !equal(raw, archived.collections)) throw new Error("Production changed after backup upload; unfreeze and rerun from a fresh backup");
    const path = `${work}/${apply ? "frozen" : "dry-run"}-raw-${Date.now()}.json`;
    await writeFile(path, JSON.stringify({ fetched_at: new Date().toISOString(), collections: raw, lock }, null, 2), { flag: "wx", mode: 0o600 });
    const source = Object.fromEntries(legacyTableNames.map(name => [name, records(raw[name])])) as LegacyBackup;
    const prepared = project(source);
    const profile = source.users.dcep93;
    const registryDocs = await api.list("admins");
    if (!profile || !registryDocs.some(doc => {
      const registry = decode({ mapValue: { fields: doc.fields } });
      return doc.name.endsWith(`/${profile.user_id}`) && registry.enabled === true && registry.email === "dcep93@gmail.com";
    })) throw new Error("Production owner admin registry missing or invalid");
    console.log(JSON.stringify({ backup: path, ...summary(prepared) }, null, 2));
    if (apply) {
      const writes = tableNames.map(name => ({ update: { name: `${documentRoot}/tables/${name}`, fields: encode({ schema_version: 1, records: prepared[name] }).mapValue.fields }, currentDocument: name === "concerts" ? { updateTime: lock!.updateTime } : { exists: false } }));
      await api.request(":commit", { writes });
      lock = undefined;
      const after = records(await api.list("tables"));
      for (const name of tableNames) if (!equal(after[name]?.records, prepared[name])) throw new Error(`Post-cutover mismatch in ${name}; inspect backup ${path}`);
      await writeFile(`${work}/cutover-verified.json`, JSON.stringify({ verified_at: new Date().toISOString(), backup: path, manifest: fileURLToPath(new URL("../imports/festival-lineups-2026-10-08.json", import.meta.url)), ...summary(prepared) }, null, 2));
      console.log("Production cutover verified. Legacy documents retained until Hosting verification.");
    } else {
      await writeFile(`${work}/prepared-raw.json`, JSON.stringify({ fetched_at: new Date().toISOString(), collections: raw }, null, 2), { mode: 0o600 });
      if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, "migration_needed=true\n");
      console.log("Dry run only; no database changes.");
    }
  } catch (error) {
    if (lock) await api.request(":commit", { writes: [{ delete: lock.name, currentDocument: { updateTime: lock.updateTime } }] }).catch(() => console.error("Migration lock remains; inspect before retrying."));
    throw error;
  }
}
