import { collection, deleteDoc, doc, runTransaction, Timestamp } from "firebase/firestore";
import type { Transaction } from "firebase/firestore";
import { db } from "./firebase";
import { collections } from "./model";
import type { Catalog, EntityKind } from "./model";
import { isTimezone } from "./time";
import { isDefaultLog } from "./logChanges";

const allowedFields = {
  venue: ["name", "timezone", "location", "image"],
  artist: ["name", "image"],
  concert: ["date", "venue_id", "artist_id", "supporting_artist_ids", "setlist_fm_url"],
  festival: ["name", "concert_ids"],
};
function requireText(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
}
function requireIDs(value: unknown, field: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id || id.includes("/")))
    throw new Error(`${field} must contain valid IDs.`);
}
function validateURL(value: unknown, field: string, setlist = false) {
  if (value === undefined || value === "") return;
  if (typeof value !== "string") throw new Error(`${field} must be a URL.`);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${field} must be a valid HTTPS URL.`);
  }
  if (url.protocol !== "https:" || (setlist && !["setlist.fm", "www.setlist.fm"].includes(url.hostname)))
    throw new Error(`${field} must be ${setlist ? "an HTTPS setlist.fm" : "an HTTPS"} URL.`);
}
async function requireReference(transaction: Transaction, collectionName: string, id: string) {
  if (id.includes("/") || !(await transaction.get(doc(db, collectionName, id))).exists())
    throw new Error("A selected record no longer exists. Refresh and choose again.");
}

export async function saveEntity(
  kind: EntityKind,
  id: string | null,
  fields: Record<string, unknown>,
): Promise<string> {
  const patch = Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => allowedFields[kind].includes(key) && value !== undefined),
  );
  const ref = id ? doc(db, collections[kind], id) : doc(collection(db, collections[kind]));
  await runTransaction(db, async (transaction) => {
    const existing = id ? await transaction.get(ref) : null;
    if (id && !existing?.exists()) throw new Error("This record has been deleted. Refresh before editing.");
    const data = { ...existing?.data(), ...patch };
    if (kind !== "concert") requireText(data.name, "Name");
    if (kind === "venue") {
      requireText(data.timezone, "Timezone");
      if (!isTimezone(data.timezone)) throw new Error("Choose a valid IANA timezone.");
    }
    if (kind === "venue" || kind === "artist") validateURL(data.image, "Image");
    if (kind === "concert") {
      requireText(data.venue_id, "Venue");
      requireText(data.artist_id, "Headliner");
      requireIDs(data.supporting_artist_ids ?? [], "Supporting artists");
      validateURL(data.setlist_fm_url, "Setlist", true);
      await Promise.all([
        requireReference(transaction, "venues", data.venue_id),
        requireReference(transaction, "artists", data.artist_id),
        ...((data.supporting_artist_ids as string[]) ?? []).map((artist) =>
          requireReference(transaction, "artists", artist),
        ),
      ]);
      const date =
        data.date instanceof Timestamp
          ? data.date.toDate()
          : typeof data.date === "string"
            ? new Date(data.date)
            : new Date(NaN);
      if (!Number.isFinite(date.getTime())) throw new Error("Choose a valid concert date and time.");
      if ("date" in patch) patch.date = Timestamp.fromDate(date);
    }
    if (kind === "festival") {
      requireIDs(data.concert_ids ?? [], "Concerts");
      await Promise.all(
        ((data.concert_ids as string[]) ?? []).map((concert) =>
          requireReference(transaction, "concerts", concert),
        ),
      );
    }
    if (id) transaction.update(ref, patch);
    else transaction.set(ref, patch);
  });
  return ref.id;
}

export async function deleteEntity(kind: EntityKind, id: string, catalog: Catalog): Promise<void> {
  const inUse =
    kind === "venue"
      ? catalog.concerts.some((concert) => concert.venue_id === id)
      : kind === "artist"
        ? catalog.concerts.some(
            (concert) => concert.artist_id === id || concert.supporting_artist_ids.includes(id),
          ) || catalog.logs.some((log) => log.supporting_artist_ids.includes(id))
        : kind === "concert"
          ? catalog.logs.some((log) => log.concert_id === id) ||
            catalog.festivals.some((festival) => festival.concert_ids.includes(id))
          : false;
  if (inUse) throw new Error("This record is still referenced. Remove its references before deleting it.");
  await deleteDoc(doc(db, collections[kind], id));
}

export async function saveLog(
  uid: string,
  concertId: string,
  fields: { notes: string; supporting_artist_ids: string[] },
  restore = false,
): Promise<void> {
  const ref = doc(db, "user_concerts", `${uid}_${concertId}`);
  await runTransaction(db, async (transaction) => {
    const concert = await transaction.get(doc(db, "concerts", concertId));
    const existing = await transaction.get(ref);
    if (!concert.exists()) throw new Error("This concert no longer exists.");
    if (existing.data()?.removed === true && !restore)
      throw new Error("This concert was removed from the log. Restore it before editing.");
    const lineup: string[] = concert.data().supporting_artist_ids ?? [];
    if (fields.supporting_artist_ids.some((artist) => !lineup.includes(artist)))
      throw new Error("Supporting artists must belong to the concert lineup.");
    const patch = { removed: false, notes: fields.notes, supporting_artist_ids: [...new Set(fields.supporting_artist_ids)] };
    if (isDefaultLog({ ...existing.data(), ...patch })) {
      if (existing.exists()) transaction.delete(ref);
    } else if (existing.exists()) transaction.update(ref, patch);
    else transaction.set(ref, { user_id: uid, concert_id: concertId, ...patch });
  });
}
export async function removeLog(uid: string, concertId: string): Promise<void> {
  const ref = doc(db, "user_concerts", `${uid}_${concertId}`);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) transaction.update(ref, { removed: true });
    else transaction.set(ref, { user_id: uid, concert_id: concertId, removed: true });
  });
}
