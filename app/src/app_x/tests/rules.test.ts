// Historical migration rules; production rules are verified by tables.test.ts.
/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { migrateCancelled } from "../data/migrateCancelled";
import { migrateIds } from "../data/migrateIds";
import legacyIds from "../data/legacyIds.json";
import type { Firestore } from "firebase/firestore";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

let env: RulesTestEnvironment;
const claims = (
  email = "owner@gmail.com",
  verified = true,
  provider: "google.com" | "password" = "google.com",
) => ({ email, email_verified: verified, firebase: { sign_in_provider: provider } });
const account = (
  uid = "owner",
  email = "owner@gmail.com",
  verified = true,
  provider: "google.com" | "password" = "google.com",
) => env.authenticatedContext(uid, claims(email, verified, provider)).firestore();
const admin = () => account("admin", "dcep93@gmail.com");
const concert = {
  date: Timestamp.fromDate(new Date("2026-10-07T20:00:00Z")),
  venue_id: "venue",
  artist_id: "artist",
  supporting_artist_ids: ["support"],
};
const log = {
  user_id: "owner",
  concert_id: "concert",
  notes: "Public note",
  supporting_artist_ids: ["support"],
  future_field: { version: 2 },
};

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw new Error("Run through firebase emulators:exec; production tests are forbidden.");
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
  env = await initializeTestEnvironment({
    projectId: "demo-rockshow420-rules",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(new URL("../backend/firestore.migration.rules", import.meta.url), "utf8"),
    },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "admins/admin"), { enabled: true, email: "dcep93@gmail.com" }),
      setDoc(doc(db, "venues/venue"), { name: "Venue", timezone: "America/New_York" }),
      setDoc(doc(db, "artists/artist"), { name: "Headliner" }),
      setDoc(doc(db, "artists/support"), { name: "Support" }),
      setDoc(doc(db, "concerts/concert"), concert),
      setDoc(doc(db, "concerts/other"), { ...concert, supporting_artist_ids: [] }),
      setDoc(doc(db, "festivals/festival"), { name: "Festival" }),
      setDoc(doc(db, "users/owner"), { user_id: "owner", future_field: 1 }),
      setDoc(doc(db, "users/other"), { user_id: "other" }),
      setDoc(doc(db, "user_concerts/owner_concert"), log),
    ]);
  });
});

test("anonymous visitors can read all app data including public notes, but cannot write", async () => {
  const db = env.unauthenticatedContext().firestore();
  for (const path of [
    "venues/venue",
    "artists/artist",
    "concerts/concert",
    "festivals/festival",
    "users/owner",
    "user_concerts/owner_concert",
  ]) {
    await assertSucceeds(getDoc(doc(db, path)));
    await assertFails(updateDoc(doc(db, path), { future_field: 2 }));
    await assertFails(deleteDoc(doc(db, path)));
  }
  for (const name of ["venues", "artists", "concerts", "festivals", "users", "user_concerts"])
    await assertSucceeds(getDocs(collection(db, name)));
  await assertFails(
    setDoc(doc(db, "user_concerts/anon_concert"), { user_id: "anon", concert_id: "concert" }),
  );
  await assertFails(getDoc(doc(db, "admins/admin")));
  await assertFails(getDoc(doc(db, "private/unknown")));
});

test("non-Gmail, unverified, and non-Google identities cannot mutate their own data", async () => {
  for (const [email, verified, provider] of [
    ["owner@example.com", true, "google.com"],
    ["owner@gmail.com", false, "google.com"],
    ["owner@gmail.com", true, "password"],
  ] as const) {
    const db = account("owner", email, verified, provider);
    await assertFails(updateDoc(doc(db, "users/owner"), { future_field: "No" }));
    await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { notes: "No" }));
    await assertFails(
      setDoc(doc(db, "user_concerts/owner_other"), { user_id: "owner", concert_id: "other" }),
    );
    await assertFails(deleteDoc(doc(db, "user_concerts/owner_concert")));
  }
});

test("verified Gmail owners create, edit, and delete only their matching profile", async () => {
  const db = account("new", "new@gmail.com");
  await assertSucceeds(setDoc(doc(db, "users/new"), { user_id: "new" }));
  await assertSucceeds(updateDoc(doc(db, "users/new"), { future_field: 42 }));
  await assertFails(setDoc(doc(db, "users/impostor"), { user_id: "new" }));
  await assertFails(updateDoc(doc(db, "users/new"), { user_id: "owner" }));
  await assertFails(updateDoc(doc(db, "users/new"), { username: "owner" }));
  await assertFails(updateDoc(doc(db, "users/new"), { email: "new@gmail.com" }));
  await assertFails(updateDoc(doc(db, "users/owner"), { future_field: "Changed" }));
  await assertFails(deleteDoc(doc(db, "users/owner")));
  await assertSucceeds(deleteDoc(doc(db, "users/new")));
});

test("owner log mutations enforce deterministic IDs, immutable identities, and lineup subsets", async () => {
  const db = account();
  await assertSucceeds(updateDoc(doc(db, "user_concerts/owner_concert"), { notes: "Edited" }));
  assert.deepEqual((await getDoc(doc(db, "user_concerts/owner_concert"))).data()?.future_field, {
    version: 2,
  });
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { user_id: "other" }));
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { concert_id: "other" }));
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { notes: 5 }));
  await assertFails(
    updateDoc(doc(db, "user_concerts/owner_concert"), { supporting_artist_ids: ["outsider"] }),
  );
  await assertFails(setDoc(doc(db, "user_concerts/random"), { user_id: "owner", concert_id: "concert" }));
  await assertFails(
    setDoc(doc(db, "user_concerts/owner_missing"), { user_id: "owner", concert_id: "missing" }),
  );
  await assertFails(setDoc(doc(db, "user_concerts/other_other"), { user_id: "other", concert_id: "other" }));
  await assertSucceeds(
    setDoc(doc(db, "user_concerts/owner_other"), { user_id: "owner", concert_id: "other" }),
  );
  await assertSucceeds(deleteDoc(doc(db, "user_concerts/owner_concert")));
  assert.equal((await getDoc(doc(db, "concerts/concert"))).exists(), true);
});

test("another owner cannot mutate someone else’s logs", async () => {
  const db = account("other", "other@gmail.com");
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { notes: "No" }));
  await assertFails(deleteDoc(doc(db, "user_concerts/owner_concert")));
  await assertFails(setDoc(doc(db, "user_concerts/owner_other"), { user_id: "owner", concert_id: "other" }));
});

test("ticket status allows missing or empty, purchased, sold_out, and cancelled for owners and admins only", async () => {
  for (const db of [account(), admin()]) {
    const ref = doc(db, "user_concerts/owner_other");
    const identity = { user_id: "owner", concert_id: "other" };
    await assertSucceeds(setDoc(ref, identity));
    for (const ticket_status of ["", "purchased", "sold_out", "cancelled"]) {
      await assertSucceeds(setDoc(ref, { ...identity, ticket_status }));
      await assertSucceeds(updateDoc(ref, { notes: "Keep my ticket", removed: true }));
      assert.equal((await getDoc(ref)).data()?.ticket_status, ticket_status);
      await assertSucceeds(updateDoc(ref, { notes: "", removed: false }));
    }
    for (const ticket_status of ["empty", "Purchased", "sold out", null, false, 0, []]) {
      await assertFails(updateDoc(ref, { ticket_status }));
      await assertFails(setDoc(ref, { ...identity, ticket_status }));
    }
    await assertSucceeds(updateDoc(ref, { ticket_status: "" }));
    await assertSucceeds(deleteDoc(ref));
  }
  await assertFails(updateDoc(doc(account("other", "other@gmail.com"), "user_concerts/owner_concert"), { ticket_status: "purchased" }));
  await assertFails(updateDoc(doc(env.unauthenticatedContext().firestore(), "user_concerts/owner_concert"), { ticket_status: "sold_out" }));
});

test("only the sole admin email plus console registry record grants catalog privileges", async () => {
  const ordinary = account();
  await assertSucceeds(updateDoc(doc(ordinary, "users/owner"), { isAdmin: true, role: "admin" }));
  await assertFails(setDoc(doc(ordinary, "artists/unauthorized"), { name: "Denied" }));
  await assertFails(
    setDoc(doc(account("unregistered", "dcep93@gmail.com"), "artists/unauthorized"), { name: "Denied" }),
  );
  for (const [email, verified, provider] of [
    ["other@gmail.com", true, "google.com"],
    ["dcep93@gmail.com", false, "google.com"],
    ["dcep93@gmail.com", true, "password"],
  ] as const) {
    await assertFails(
      setDoc(doc(account("admin", email, verified, provider), "artists/unauthorized"), { name: "Denied" }),
    );
  }
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "admins/admin"), { enabled: false });
  });
  await assertFails(setDoc(doc(admin(), "artists/unauthorized"), { name: "Denied" }));
});

test("the admin registry is owner-read-only and cannot be written by any client", async () => {
  for (const db of [admin(), account(), env.unauthenticatedContext().firestore()]) {
    await assertFails(setDoc(doc(db, "admins/owner"), { enabled: true, email: "dcep93@gmail.com" }));
    await assertFails(updateDoc(doc(db, "admins/admin"), { enabled: false }));
    await assertFails(deleteDoc(doc(db, "admins/admin")));
    await assertFails(getDocs(collection(db, "admins")));
  }
  await assertSucceeds(getDoc(doc(admin(), "admins/admin")));
  await assertSucceeds(getDoc(doc(account(), "admins/owner")));
  await assertFails(getDoc(doc(account(), "admins/admin")));
});

test("admin manages catalog and other user data while preserving identity invariants", async () => {
  const db = admin();
  for (const [path, data] of [
    ["venues/new", { name: "New", timezone: "UTC" }],
    ["artists/new", { name: "New" }],
    ["concerts/new", concert],
    ["festivals/new", { name: "New" }],
  ] as const) {
    await assertSucceeds(setDoc(doc(db, path), { ...data, unknown_future: 1 }));
    await assertSucceeds(updateDoc(doc(db, path), { unknown_future: 2 }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  }
  await assertSucceeds(updateDoc(doc(db, "users/owner"), { future_field: "Admin edited" }));
  await assertSucceeds(updateDoc(doc(db, "user_concerts/owner_concert"), { notes: "Admin edited" }));
  await assertSucceeds(
    setDoc(doc(db, "user_concerts/other_other"), { user_id: "other", concert_id: "other" }),
  );
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { concert_id: "other" }));
  await assertFails(updateDoc(doc(db, "user_concerts/owner_concert"), { user_id: "admin" }));
  await assertSucceeds(deleteDoc(doc(db, "user_concerts/owner_concert")));
  await assertSucceeds(deleteDoc(doc(db, "users/owner")));
});

test("catalog validation accepts optional omissions and rejects missing essentials or wrong types", async () => {
  const db = admin();
  await assertSucceeds(
    setDoc(doc(db, "concerts/minimal"), { date: concert.date, venue_id: "venue", artist_id: "artist" }),
  );
  await assertFails(setDoc(doc(db, "venues/bad"), { name: "Bad" }));
  await assertFails(setDoc(doc(db, "artists/bad"), { name: 12 }));
  await assertFails(setDoc(doc(db, "concerts/bad"), { ...concert, date: "2026-10-07" }));
  await assertFails(setDoc(doc(db, "concerts/bad"), { ...concert, venue_id: "missing" }));
  await assertFails(setDoc(doc(db, "festivals/bad"), { name: "Bad", concert_ids: "concert" }));
});

test("named date-only events allow unknown performers and venues without widening write access", async () => {
  const event = { name: "Festival", date: concert.date, date_precision: "day", end_date: "2026-10-09" };
  await assertSucceeds(setDoc(doc(admin(), "concerts/date-only"), event));
  for (const db of [account(), env.unauthenticatedContext().firestore()])
    await assertFails(setDoc(doc(db, "concerts/forbidden"), event));
  await assertFails(setDoc(doc(admin(), "concerts/bad"), { ...event, name: "" }));
  await assertFails(setDoc(doc(admin(), "concerts/bad"), { ...event, date_precision: "time" }));
  await assertFails(setDoc(doc(admin(), "concerts/bad"), { ...event, artist_id: "missing" }));
  await assertFails(setDoc(doc(admin(), "concerts/bad"), { ...event, venue_id: "missing" }));
});

test("the complete Notion import respects deployed validation and document access limits", async () => {
  const manifest = JSON.parse(readFileSync(new URL("../data/imports/notion-concerts.json", import.meta.url), "utf8"));
  assert.equal(manifest.source_entries, 336);
  assert.equal(manifest.concerts.length + manifest.existing_concerts.length, 354);
  const db = admin();
  const sourceRows = new Set(manifest.existing_concerts.map((item: { row: number }) => item.row));
  for (const group of ["venues", "artists", "concerts", "festivals"]) {
    const records = manifest[group];
    assert.equal(new Set(records.map((record: { id: string }) => record.id)).size, records.length);
    for (let offset = 0; offset < records.length; offset += 5) {
      const batch = writeBatch(db);
      for (const record of records.slice(offset, offset + 5)) {
        const { id, ...fields } = record;
        if (fields.date) fields.date = Timestamp.fromDate(new Date(fields.date));
        if (group === "concerts") sourceRows.add(fields.import_source.row);
        batch.set(doc(db, group, id), fields);
      }
      await assertSucceeds(batch.commit());
    }
  }
  assert.equal(sourceRows.size, 336);
  assert.equal((await getDocs(collection(db, "user_concerts"))).size, 1);
  for (const { id } of manifest.existing_concerts) await setDoc(doc(db, "concerts", id), concert);
  const original = manifest.concerts[0].id as keyof typeof legacyIds.concerts;
  const next = legacyIds.concerts[original];
  // Rules testing exposes the compat type; the modular SDK unwraps it at runtime.
  const migrationDb = db as unknown as Firestore;
  const entry = { user_id: "owner", concert_id: original, notes: "Preserve me", ticket_status: "purchased", removed: true, future_field: { version: 9 } };
  await setDoc(doc(db, "user_concerts", `owner_${original}`), entry);
  await setDoc(doc(db, "concerts", next), { ...concert, name: "Do not overwrite me" });
  await assert.rejects(() => migrateIds(migrationDb, () => {}), /Destination exists/);
  assert.equal((await getDoc(doc(db, "concerts", next))).data()?.name, "Do not overwrite me");
  await deleteDoc(doc(db, "concerts", next));
  assert.equal((await migrateIds(migrationDb, () => {})).changed, 369);
  assert.equal((await getDoc(doc(db, "concerts", original))).exists(), false);
  assert.deepEqual((await getDoc(doc(db, "user_concerts", `owner_${next}`))).data(), { ...entry, concert_id: next });
  assert.equal((await getDoc(doc(db, "user_concerts", `owner_${original}`))).exists(), false);
  assert.equal((await migrateIds(migrationDb, () => {})).changed, 0);
});

test("owners hide default concerts, restore entries and cannot hide another user's concerts", async () => {
  const db = account();
  const ref = doc(db, "user_concerts/owner_other");
  await assertSucceeds(setDoc(ref, { user_id: "owner", concert_id: "other", removed: true }));
  await assertSucceeds(updateDoc(ref, { removed: false, notes: "Restored" }));
  await assertFails(updateDoc(ref, { removed: "true" }));
  await assertFails(updateDoc(doc(account("other", "other@gmail.com"), "user_concerts/owner_other"), { removed: true }));
  await assertFails(setDoc(doc(db, "user_concerts/other_other"), { user_id: "other", concert_id: "other", removed: true }));
  await assertSucceeds(updateDoc(doc(admin(), "user_concerts/owner_other"), { removed: true }));
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "concerts/concert"), { supporting_artist_ids: [] });
  });
  const edited = doc(db, "user_concerts/owner_concert");
  await assertSucceeds(updateDoc(edited, { removed: true }));
  assert.equal((await getDoc(edited)).data()?.notes, "Public note");
  assert.deepEqual((await getDoc(edited)).data()?.future_field, { version: 2 });
  await assertFails(updateDoc(edited, { removed: false }));
  await assertSucceeds(updateDoc(edited, { removed: false, supporting_artist_ids: [] }));
  await env.withSecurityRulesDisabled(async (context) => {
    await deleteDoc(doc(context.firestore(), "concerts/concert"));
  });
  await assertSucceeds(updateDoc(edited, { removed: true }));
});


test("cancelled import markers move to the owner's ticket status without losing other data", async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "concerts/concert"), { status: "cancelled", future_field: 7 });
    await setDoc(doc(context.firestore(), "user_concerts/owner_concert"), { ...log, ticket_status: "purchased" });
  });
  assert.equal(await migrateCancelled(admin() as unknown as Firestore, "owner"), 1);
  const saved = (await getDoc(doc(admin(), "user_concerts/owner_concert"))).data();
  assert.deepEqual(saved, { ...log, ticket_status: "cancelled" });
  const event = (await getDoc(doc(admin(), "concerts/concert"))).data();
  assert.equal(event?.status, undefined);
  assert.equal(event?.future_field, 7);
  assert.equal(await migrateCancelled(admin() as unknown as Firestore, "owner"), 0);
});
