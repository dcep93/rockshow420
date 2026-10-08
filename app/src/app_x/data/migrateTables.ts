import { collection, getDocFromServer, getDocsFromServer, limit, query, runTransaction } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { tableNames, tableRef, tableRecords } from "./tables";
import type { Records, TableName } from "./tables";
import { cleanSchema } from "./cleanSchema";
import type { CleanupOptions } from "./cleanSchema";

export const legacyTableNames = ["venues", "artists", "concerts", "festivals", "users", "user_concerts"] as const;
export type LegacyBackup = Record<typeof legacyTableNames[number], Records>;
export type TableBackup = Record<TableName, Records>;
export function validateTableSize(records: Records) {
  // Conservative JSON guard; Firestore also enforces the exact encoded 1 MiB limit.
  if (new TextEncoder().encode(JSON.stringify(records)).length > 900_000)
    throw new Error("A table is too large to migrate safely into one Firestore document.");
}

/** New rules must be deployed first. saveBackup must durably save the raw snapshot.
 * An active schema_version: 0 concerts table freezes legacy writes.
 * Source records are never deleted and cached catalogs are never accepted.
 */
export async function migrateTables(db: Firestore, saveBackup: (backup: LegacyBackup) => Promise<void>, options: CleanupOptions = {}) {
  const lock = tableRef(db, "concerts");
  const initial = await getDocFromServer(lock);
  if (initial.data()?.schema_version === 1) {
    for (const name of tableNames) tableRecords(await getDocFromServer(tableRef(db, name)));
    return { migrated: false };
  }
  // Detect exhausted quota before freezing a still-writable source database.
  await getDocsFromServer(query(collection(db, "concerts"), limit(1)));
  const token = crypto.randomUUID();
  let claimed = false;
  try {
    await runTransaction(db, async transaction => {
      const current = await transaction.get(lock);
      if (current.exists()) throw new Error("A migration is already active. Check its backup and release its lock before retrying.");
      transaction.set(lock, { schema_version: 0, records: {}, migration_token: token });
    });
    claimed = true;
    const backup = Object.fromEntries(await Promise.all(legacyTableNames.map(async name => {
      const snapshot = await getDocsFromServer(collection(db, name));
      const records = Object.fromEntries(snapshot.docs.map(item => [item.id, item.data()]));
      validateTableSize(records);
      return [name, records];
    }))) as LegacyBackup;
    await saveBackup(backup);
    const cleaned = cleanSchema(backup, options);
    for (const name of tableNames) validateTableSize(cleaned[name]);
    await runTransaction(db, async transaction => {
      const snapshots = await Promise.all(tableNames.map(name => transaction.get(tableRef(db, name))));
      const current = snapshots[tableNames.indexOf("concerts")].data();
      if (current?.schema_version !== 0 || current.migration_token !== token) throw new Error("Migration lock changed.");
      if (snapshots.some((snapshot, i) => tableNames[i] !== "concerts" && snapshot.exists())) throw new Error("A destination table already exists; refusing to overwrite it.");
      for (const name of tableNames) transaction.set(tableRef(db, name), { schema_version: 1, records: cleaned[name] });
    });
    return { migrated: true, counts: Object.fromEntries(tableNames.map(name => [name, Object.keys(cleaned[name]).length])) };
  } catch (error) {
    if (claimed) {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(lock);
        if (snapshot.data()?.schema_version === 0 && snapshot.data()?.migration_token === token) transaction.delete(lock);
      }).catch(() => { /* If reads fail, keep the freeze for manual recovery. */ });
    }
    throw error;
  }
}
