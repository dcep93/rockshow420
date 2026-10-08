import { deleteField, doc, FieldPath, onSnapshot } from "firebase/firestore";
import type { DocumentData, DocumentSnapshot, Firestore, Transaction } from "firebase/firestore";

export const tableNames = ["venues", "artists", "concerts", "schedules", "users", "user_concerts"] as const;
export type TableName = typeof tableNames[number];
export type Records = Record<string, DocumentData>;
export const tableRef = (db: Firestore, name: TableName) => doc(db, "tables", name);
export function tableRecords(snapshot: DocumentSnapshot): Records {
  const data = snapshot.data();
  if (!snapshot.exists() || data?.schema_version !== 1 || !data.records || typeof data.records !== "object" || Array.isArray(data.records))
    throw new Error("The database migration is not complete.");
  if (Object.values(data.records).some(value => !value || typeof value !== "object" || Array.isArray(value)))
    throw new Error("The database contains an invalid table entry.");
  return data.records;
}
export function record(records: Records, id: string): DocumentData | undefined {
  return Object.hasOwn(records, id) ? records[id] : undefined;
}
export function watchTables(db: Firestore, next: (name: TableName, records: Records) => void, error: (name: TableName, error: unknown) => void) {
  const stops = tableNames.map(name => onSnapshot(tableRef(db, name), snapshot => {
    try { next(name, tableRecords(snapshot)); } catch (failure) { error(name, failure); }
  }, failure => error(name, failure)));
  return () => stops.forEach(stop => stop());
}
// Read each shared document at most once per transaction, even for many references.
export function transactionTables(db: Firestore, transaction: Transaction) {
  const cache = new Map<TableName, Promise<Records>>();
  const read = (name: TableName) => {
    if (!cache.has(name)) cache.set(name, transaction.get(tableRef(db, name)).then(tableRecords));
    return cache.get(name)!;
  };
  const put = (name: TableName, id: string, data: DocumentData | null) => {
    transaction.update(tableRef(db, name), new FieldPath("records", id), data ?? deleteField(), "changed_id", id);
  };
  return { read, put };
}
