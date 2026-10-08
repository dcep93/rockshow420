import { collection, doc, getDocsFromServer, runTransaction } from "firebase/firestore";
import type { Firestore, DocumentData } from "firebase/firestore";
import legacyIds from "./legacyIds.json";

type Snapshot = Record<string, Record<string, DocumentData>>;
const names = ["concerts", "festivals", "user_concerts", "artists", "venues", "users"];
async function snapshot(db: Firestore): Promise<Snapshot> {
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name,
    Object.fromEntries((await getDocsFromServer(collection(db, name))).docs.map((item) => [item.id, item.data()])),
  ])));
}
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(",")}}`;
  return JSON.stringify(value);
};

export function renamedSnapshot(before: Snapshot): Snapshot {
  const concertIds: Record<string, string> = legacyIds.concerts;
  const festivalIds: Record<string, string> = legacyIds.festivals;
  const concertId = (id: string) => concertIds[id] || id;
  return {
    ...before,
    concerts: Object.fromEntries(Object.entries(before.concerts).map(([id, data]) => [concertId(id), data])),
    festivals: Object.fromEntries(Object.entries(before.festivals).map(([id, data]) => [festivalIds[id] || id, {
      ...data, ...(data.concert_ids ? { concert_ids: data.concert_ids.map(concertId) } : {}),
    }])),
    user_concerts: Object.fromEntries(Object.entries(before.user_concerts).map(([id, data]) => {
      const next = concertId(data.concert_id);
      return [next === data.concert_id ? id : `${data.user_id}_${next}`, { ...data, concert_id: next }];
    })),
  };
}

// An admin-only, one-off operation. References and source removal move atomically.
// A destination is never overwritten; interrupted runs can safely resume.
export async function migrateIds(db: Firestore, progress: (message: string) => void) {
  const before = await snapshot(db);
  const mappings: Record<string, Record<string, string>> = legacyIds;
  for (const name of ["concerts", "festivals"]) {
    for (const [oldId, newId] of Object.entries(mappings[name])) {
      if (before[name][oldId] && before[name][newId] && stable(before[name][oldId]) !== stable(before[name][newId])) throw new Error(`Destination exists: ${name}/${newId}`);
      if (!before[name][oldId] && !before[name][newId]) throw new Error(`Missing record: ${name}/${oldId}`);
    }
  }
  let changed = 0;
  for (const name of ["concerts", "festivals"]) {
    const entries = Object.entries(mappings[name]);
    for (let offset = 0; offset < entries.length; offset += 4) {
      await Promise.all(entries.slice(offset, offset + 4).map(async ([oldId, newId]) => {
        if (!before[name][oldId]) return;
        // Existing rules validate log references against committed concerts.
        // Stage the identical target first only when a personal entry needs moving.
        if (name === "concerts" && Object.values(before.user_concerts).some((data) => data.concert_id === oldId)) {
          await runTransaction(db, async (transaction) => {
            const source = await transaction.get(doc(db, name, oldId));
            const target = await transaction.get(doc(db, name, newId));
            if (source.exists() && !target.exists()) transaction.set(target.ref, source.data());
            else if (source.exists() && stable(source.data()) !== stable(target.data())) throw new Error(`Destination exists: ${newId}`);
          });
        }
        const moved = await runTransaction(db, async (transaction) => {
          const source = doc(db, name, oldId), target = doc(db, name, newId);
          const [oldDoc, newDoc] = await Promise.all([transaction.get(source), transaction.get(target)]);
          if (!oldDoc.exists()) {
            if (!newDoc.exists()) throw new Error(`Missing both IDs: ${oldId}`);
            return false;
          }
          if (newDoc.exists() && stable(newDoc.data()) !== stable(oldDoc.data())) throw new Error(`Destination exists: ${newId}`);
          const festivalRefs = name === "concerts" ? Object.entries(before.festivals).filter(([, data]) => data.concert_ids?.includes(oldId)).map(([id]) => doc(db, "festivals", id)) : [];
          const logRefs = name === "concerts" ? Object.entries(before.user_concerts).filter(([, data]) => data.concert_id === oldId).map(([id, data]) => ({
            source: doc(db, "user_concerts", id), target: doc(db, "user_concerts", `${data.user_id}_${newId}`),
          })) : [];
          const festivals = await Promise.all(festivalRefs.map((ref) => transaction.get(ref)));
          const logs = await Promise.all(logRefs.map(async (refs) => ({ ...refs, old: await transaction.get(refs.source), next: await transaction.get(refs.target) })));
          transaction.set(target, oldDoc.data());
          for (const festival of festivals) {
            if (festival.exists()) transaction.update(festival.ref, { concert_ids: festival.data().concert_ids.map((id: string) => id === oldId ? newId : id) });
          }
          for (const log of logs) {
            if (!log.old.exists()) continue;
            if (log.next.exists()) throw new Error("Destination user entry exists.");
            if (log.old.data()!.concert_id !== oldId) throw new Error("User entry changed during migration.");
            transaction.set(log.target, { ...log.old.data(), concert_id: newId });
            transaction.delete(log.source);
          }
          transaction.delete(source);
          return true;
        });
        if (moved) changed++;
      }));
      progress(`Renamed ${changed} records`);
    }
  }
  const after = await snapshot(db);
  const expected = renamedSnapshot(before);
  const differences = names.flatMap((name) => [...new Set([...Object.keys(expected[name]), ...Object.keys(after[name])])]
    .filter((id) => stable(expected[name][id]) !== stable(after[name][id])).map((id) => `${name}/${id}`));
  if (differences.length) throw new Error(`Post-migration comparison failed: ${differences.join(", ")}`);
  progress(`Verified ${changed} renames; all fields and references preserved.`);
  return { changed, counts: Object.fromEntries(names.map((name) => [name, Object.keys(after[name]).length])) };
}
