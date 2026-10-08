import { collection, deleteField, doc, getDocsFromServer, query, runTransaction, where } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

// One-off import cleanup. Move the marker only after preserving it on the owner's log.
export async function migrateCancelled(db: Firestore, uid: string): Promise<number> {
  const concerts = await getDocsFromServer(query(collection(db, "concerts"), where("status", "==", "cancelled")));
  let migrated = 0;
  for (const concert of concerts.docs) {
    const changed = await runTransaction(db, async (transaction) => {
      const logRef = doc(db, "user_concerts", `${uid}_${concert.id}`);
      const current = await transaction.get(concert.ref);
      const log = await transaction.get(logRef);
      if (current.data()?.status !== "cancelled") return false;
      transaction.set(logRef, { ...log.data(), user_id: uid, concert_id: concert.id, ticket_status: "cancelled" });
      transaction.update(concert.ref, { status: deleteField() });
      return true;
    });
    if (changed) migrated++;
  }
  return migrated;
}
