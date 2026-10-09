/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { before, after, beforeEach, test } from "node:test";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, deleteField, doc, FieldPath, getDoc, setDoc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { record, tableNames, tableRef, tableRecords, watchTables } from "../data/tables";
import { createTableActions } from "../data/tableActions";
import { migrateTables, validateTableSize } from "../data/migrateTables";
import { emptyCatalog } from "../data/model";

let env: RulesTestEnvironment;
let migrationRules = false;
async function loadRules(migration = false) {
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
  await env?.cleanup();
  env = await initializeTestEnvironment({ projectId: "demo-rockshow420-tables", firestore: { host, port: Number(port), rules: readFileSync(new URL(migration ? "../backend/firestore.migration.rules" : "../backend/firestore.rules", import.meta.url), "utf8") } });
  migrationRules = migration;
}
const user = (uid = "owner", email = "owner@gmail.com", verified = true, provider: "google.com" | "password" = "google.com") => env.authenticatedContext(uid, { email, email_verified: verified, firebase: { sign_in_provider: provider } }).firestore() as unknown as Firestore;
const admin = () => user("admin", "dcep93@gmail.com");
const show = { date: Timestamp.fromDate(new Date("2026-10-07T20:30:45.123Z")), venue_id: "venue", artist_id: "artist", supporting_artist_ids: ["support"], future_field: { version: 3 } };
const log = { user_id: "owner", concert_id: "concert", notes: "Public", supporting_artist_ids: ["support"], ticket_status: "purchased", future_field: { version: 9 } };
const fixtures = {
  venues: { venue: { name: "Venue", timezone: "America/New_York" } },
  artists: { artist: { name: "Artist" }, support: { name: "Support" } },
  concerts: { concert: show, other: { ...show, supporting_artist_ids: [] } },
  schedules: {},
  users: { owner: { user_id: "owner", username: "owner", future_field: 2 }, other: { user_id: "other", username: "other" } },
  user_concerts: { owner_concert: log },
};
async function change(db: Firestore, table: typeof tableNames[number], id: string, value: unknown) {
  return updateDoc(tableRef(db, table), new FieldPath("records", id), value, "changed_id", id);
}
async function records(db: Firestore, name: typeof tableNames[number]) { return tableRecords(await getDoc(tableRef(db, name))); }

before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Emulator required; production tests forbidden.");
  await loadRules();
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  if (migrationRules) await loadRules();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore() as unknown as Firestore;
    await setDoc(doc(db, "admins/admin"), { enabled: true, email: "dcep93@gmail.com" });
    for (const name of tableNames) await setDoc(tableRef(db, name), { schema_version: 1, records: fixtures[name] });
    await setDoc(doc(db, "concerts/legacy"), show);
  });
});

test("catalog subscriptions deliver exactly six public document snapshots", async () => {
  const db = env.unauthenticatedContext().firestore() as unknown as Firestore;
  const seen = new Set<string>();
  let stop: () => void = () => {};
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error("Six table subscriptions did not finish")); }, 10000);
    stop = watchTables(db, (name, values) => {
      seen.add(name);
      assert.deepEqual(Object.keys(values).sort(), Object.keys(fixtures[name]).sort());
      if (seen.size === 6) { clearTimeout(timer); resolve(); }
    }, (_name, error) => { clearTimeout(timer); reject(error); });
  });
  stop();
  assert.deepEqual([...seen].sort(), [...tableNames].sort());
  assert.equal((await Promise.all(tableNames.map(name => getDoc(tableRef(db, name))))).filter(s => s.exists()).length, 6);
  await assertFails(change(db, "artists", "artist", { name: "No" }));
  await assertFails(getDoc(doc(db, "admins/admin")));
});

test("verified users can only change their own profile and log map entries", async () => {
  const db = user();
  await assertSucceeds(change(db, "users", "owner", { ...fixtures.users.owner, future_field: 3 }));
  await assertSucceeds(change(db, "user_concerts", "owner_concert", { ...log, notes: "Edited" }));
  await assertFails(change(db, "users", "other", { ...fixtures.users.other, future_field: 3 }));
  await assertFails(change(db, "user_concerts", "other_concert", { ...log, user_id: "other" }));
  await assertFails(change(db, "user_concerts", "owner_concert", { ...log, user_id: "other" }));
  await assertFails(change(db, "user_concerts", "owner_concert", { ...log, concert_id: "other" }));
  await assertFails(change(db, "users", "owner", { ...fixtures.users.owner, user_id: "admin" }));
  await assertFails(change(db, "users", "owner", { ...fixtures.users.owner, email: "secret@gmail.com" }));
  await assertFails(change(db, "users", "owner", null));
  await assertSucceeds(change(db, "user_concerts", "owner_concert", deleteField()));
  await assertFails(change(db, "users", "other", deleteField()));
  const fresh = user("new", "new@gmail.com");
  await assertSucceeds(change(fresh, "users", "new", { user_id: "new", username: "new" }));
  await assertFails(change(fresh, "users", "alias", { user_id: "new", username: "alias" }));
});

test("malicious writes cannot replace tables, forge changed_id, touch two entries, or change metadata", async () => {
  const db = user();
  await assertFails(setDoc(tableRef(db, "users"), { schema_version: 1, changed_id: "owner", records: { owner: fixtures.users.owner } }));
  await assertFails(updateDoc(tableRef(db, "users"), "records.owner.future_field", 5, "records.other.future_field", 5, "changed_id", "owner"));
  await assertFails(updateDoc(tableRef(db, "users"), "records.other.future_field", 5, "changed_id", "owner"));
  await assertFails(updateDoc(tableRef(db, "users"), "schema_version", 2, "changed_id", "owner"));
  await assertFails(deleteDoc(tableRef(db, "users")));
  await assertFails(change(db, "artists", "artist", { name: "No" }));
  await assertFails(updateDoc(doc(db, "admins/admin"), { enabled: true }));
});

test("deployment receipts survive admin edits and cannot be changed by clients", async () => {
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), "tables/concerts"), { applied_revisions: { reviewed: "sha256" } });
  });
  await assertSucceeds(change(admin(), "concerts", "concert", { ...show, name: "Edited after import" }));
  assert.deepEqual((await getDoc(tableRef(admin(), "concerts"))).data()!.applied_revisions, { reviewed: "sha256" });
  await assertFails(updateDoc(tableRef(admin(), "concerts"), { applied_revisions: {}, changed_id: "concert" }));
  await assertFails(updateDoc(tableRef(user(), "concerts"), { applied_revisions: {}, changed_id: "concert" }));
});

test("non-Gmail, unverified and non-Google users cannot write; registry is required for admin", async () => {
  for (const db of [user("owner", "owner@example.com"), user("owner", "owner@gmail.com", false), user("owner", "owner@gmail.com", true, "password")])
    await assertFails(change(db, "user_concerts", "owner_concert", { ...log, notes: "No" }));
  await assertFails(change(user("not-registered", "dcep93@gmail.com"), "artists", "artist", { name: "No" }));
  await assertSucceeds(change(admin(), "artists", "artist", { name: "Yes", future_field: 7 }));
  await assertSucceeds(change(admin(), "user_concerts", "owner_concert", { ...log, notes: "Admin edited" }));
});

test("log validation and default cleanup survive the new layout", async () => {
  const db = user();
  for (const ticket_status of ["", "purchased", "sold_out", "cancelled"])
    await assertSucceeds(change(db, "user_concerts", "owner_concert", { ...log, ticket_status }));
  await assertFails(change(db, "user_concerts", "owner_concert", { ...log, ticket_status: "empty" }));
  await assertFails(change(db, "user_concerts", "owner_concert", { ...log, notes: 1 }));
  await assertFails(change(db, "user_concerts", "owner_concert", { ...log, supporting_artist_ids: ["outsider"] }));
  const actions = createTableActions(db);
  const defaults = { notes: "", supporting_artist_ids: [], ticket_status: "" as const };
  await actions.saveLog("owner", "other", { ...defaults, notes: "Temporary" });
  await actions.saveLog("owner", "other", defaults);
  assert.equal(record(await records(db, "user_concerts"), "owner_other"), undefined);
  await actions.saveLog("owner", "concert", defaults);
  assert.deepEqual(record(await records(db, "user_concerts"), "owner_concert")?.future_field, { version: 9 });
  await actions.saveLog("owner", "other", { ...defaults, removed: true });
  await assert.rejects(() => actions.saveLog("owner", "other", { ...defaults, removed: false }), /hidden/);
  await actions.saveLog("owner", "other", { ...defaults, removed: false }, true);
  assert.equal(record(await records(db, "user_concerts"), "owner_other"), undefined);
});

test("partial log writes isolate notes, preserve concurrent controls and clean default resets", async () => {
  const db = user();
  const actions = createTableActions(db);
  await Promise.all([
    actions.saveLog("owner", "concert", { notes: "Explicitly saved" }),
    actions.saveLog("owner", "concert", { ticket_status: "sold_out" }),
  ]);
  let saved = record(await records(db, "user_concerts"), "owner_concert")!;
  assert.equal(saved.notes, "Explicitly saved");
  assert.equal(saved.ticket_status, "sold_out");
  assert.deepEqual(saved.supporting_artist_ids, ["support"]);
  assert.deepEqual(saved.future_field, { version: 9 });
  await actions.saveLog("owner", "concert", { supporting_artist_ids: [], removed: true });
  await actions.saveLog("owner", "concert", { ticket_status: "cancelled" });
  await actions.saveLog("owner", "concert", { notes: "Saved while hidden" });
  saved = record(await records(db, "user_concerts"), "owner_concert")!;
  assert.equal(saved.removed, true);
  assert.equal(saved.ticket_status, "cancelled");
  assert.equal(saved.notes, "Saved while hidden");
  await assert.rejects(() => actions.saveLog("owner", "concert", { removed: false }), /hidden/);
  await actions.saveLog("owner", "other", { ticket_status: "purchased" });
  await actions.saveLog("owner", "other", { ticket_status: "" });
  assert.equal(record(await records(db, "user_concerts"), "owner_other"), undefined);
  await actions.saveLog("owner", "other", { removed: true });
  await actions.saveLog("owner", "other", { removed: false }, true);
  assert.equal(record(await records(db, "user_concerts"), "owner_other"), undefined);
});

test("concurrent edits to different entries preserve both entries and unknown fields", async () => {
  const actions = createTableActions(admin());
  await Promise.all([
    actions.saveEntity("artist", "artist", { name: "Changed A" }),
    actions.saveEntity("artist", "support", { name: "Changed B" }),
  ]);
  const artists = await records(admin(), "artists");
  assert.equal(artists.artist.name, "Changed A");
  assert.equal(artists.support.name, "Changed B");
  await actions.saveEntity("concert", "concert", { name: "Exact", setlist_fm_url: "https://www.setlist.fm/setlist/example" });
  const saved = (await records(admin(), "concerts")).concert;
  assert.equal(saved.date.toMillis(), show.date.toMillis());
  assert.deepEqual(saved.future_field, show.future_field);
  await assert.rejects(() => actions.deleteEntity("artist", "artist", emptyCatalog), /referenced/);
  const id = await actions.saveEntity("artist", null, { name: "New" });
  await actions.deleteEntity("artist", id, emptyCatalog);
  assert.equal(record(await records(admin(), "artists"), id), undefined);
});

test("table mutation validates references and supports IDs containing dots as literal map keys", async () => {
  await assertFails(change(admin(), "concerts", "bad", { ...show, venue_id: "missing" }));
  await assertFails(change(admin(), "concerts", "bad", { ...show, date: "2026-10-07" }));
  await assertFails(change(admin(), "venues", "bad", { name: "No timezone" }));
  const actions = createTableActions(admin());
  await change(admin(), "artists", "artist.with.dots", { name: "Dotted", future_field: 1 });
  await actions.saveEntity("artist", "artist.with.dots", { name: "Still dotted" });
  assert.equal((await records(admin(), "artists"))["artist.with.dots"].future_field, 1);
  assert.equal(record(await records(admin(), "artists"), "__proto__"), undefined);
});

async function legacyOnly(migration = false) {
  if (migration) await loadRules(true);
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore() as unknown as Firestore;
    for (const name of tableNames) {
      await deleteDoc(tableRef(db, name));
      for (const [id, data] of Object.entries(fixtures[name])) await setDoc(doc(db, name, id), Object.fromEntries(Object.entries(data).filter(([key]) => key !== "future_field")));
    }
    await updateDoc(doc(db, "concerts/legacy"), { future_field: deleteField() });
  });
}
test("migration backs up current raw data, freezes legacy writes, publishes six docs atomically and is idempotent", async () => {
  await legacyOnly(true);
  let saved = false;
  const result = await migrateTables(admin(), async backup => {
    assert.deepEqual(backup.user_concerts.owner_concert, Object.fromEntries(Object.entries(log).filter(([key]) => key !== "future_field")));
    assert.equal(backup.concerts.concert.date.toMillis(), show.date.toMillis());
    await assertFails(updateDoc(doc(admin(), "concerts/concert"), { name: "Late edit" }));
    await assertFails(deleteDoc(doc(user(), "users/owner")));
    await assertFails(deleteDoc(doc(user(), "user_concerts/owner_concert")));
    saved = true;
  });
  assert.equal(saved, true);
  assert.equal(result.migrated, true);
  assert.equal((await Promise.all(tableNames.map(name => getDoc(tableRef(admin(), name))))).filter(s => s.exists()).length, 6);
  assert.equal((await records(admin(), "concerts")).concert.date.toMillis(), show.date.toMillis());
  assert.equal((await getDoc(doc(admin(), "concerts/concert"))).exists(), true);
  await assertFails(updateDoc(doc(admin(), "concerts/concert"), { name: "Old client" }));
  await assertFails(deleteDoc(doc(user(), "users/owner")));
  await assertFails(deleteDoc(doc(user(), "user_concerts/owner_concert")));
  assert.equal((await migrateTables(admin(), async () => { throw new Error("Must not back up again"); })).migrated, false);
});

test("migration failures never publish partial tables or overwrite a destination", async () => {
  await legacyOnly(true);
  await assert.rejects(() => migrateTables(admin(), async () => { throw new Error("Backup failed"); }), /Backup failed/);
  assert.equal((await getDoc(tableRef(admin(), "concerts"))).exists(), false);
  await assertSucceeds(updateDoc(doc(admin(), "concerts/concert"), { name: "Unfrozen" }));
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(tableRef(context.firestore() as unknown as Firestore, "artists"), { schema_version: 1, records: { keep: { name: "Keep me" } } });
  });
  await assert.rejects(() => migrateTables(admin(), async () => {}), /destination table already exists/);
  assert.equal((await records(admin(), "artists")).keep.name, "Keep me");
  assert.equal((await getDoc(tableRef(admin(), "concerts"))).exists(), false);
  assert.throws(() => validateTableSize({ huge: { text: "x".repeat(900_000) } }), /too large/);
});

test("admin can initialize all tables in one atomic batch", async () => {
  await legacyOnly();
  const db = admin();
  const batch = writeBatch(db);
  for (const name of tableNames) batch.set(tableRef(db, name), { schema_version: 1, records: fixtures[name] });
  await assertSucceeds(batch.commit());
});

test("scheduled sets default unseen, support repeats, and delete an override when reset", async () => {
  const actions = createTableActions(admin());
  const sets = [
    { id: "first1", artist_id: "artist", start: "2026-10-07T20:00:00-04:00", stage: "Main" },
    { id: "second", artist_id: "artist", start: "2026-10-07T22:00:00-04:00", stage: "Main" },
  ];
  await actions.saveSchedule("other", sets);
  const owner = createTableActions(user());
  const defaults = { notes: "", supporting_artist_ids: [], ticket_status: "" as const, seen_set_ids: [] };
  await owner.saveLog("owner", "other", defaults);
  assert.equal(record(await records(user(), "user_concerts"), "owner_other"), undefined);
  await owner.saveLog("owner", "other", { ...defaults, seen_set_ids: ["second"] });
  assert.deepEqual((await records(user(), "user_concerts")).owner_other.seen_set_ids, ["second"]);
  await assert.rejects(() => actions.saveSchedule("other", sets.slice(0, 1)), /selected set/);
  await assert.rejects(() => actions.saveEntity("concert", "other", { artist_id: "support" }), /lineup/);
  await assert.rejects(() => actions.deleteEntity("concert", "other", emptyCatalog), /referenced/);
  await owner.saveLog("owner", "other", defaults);
  assert.equal(record(await records(user(), "user_concerts"), "owner_other"), undefined);
  await actions.saveSchedule("other", []);
  assert.equal(record(await records(admin(), "schedules"), "other"), undefined);
});

test("schedule writes are admin-only and seen-set IDs must belong to the same concert", async () => {
  await createTableActions(admin()).saveSchedule("other", [{ id: "first1", artist_id: "artist" }]);
  const data = { user_id: "owner", concert_id: "other", seen_set_ids: ["first1"] };
  await assertSucceeds(change(user(), "user_concerts", "owner_other", data));
  await assertFails(change(user(), "user_concerts", "owner_concert", { ...log, seen_set_ids: ["first1"] }));
  await assertFails(change(user(), "user_concerts", "owner_other", { ...data, seen_set_ids: ["invented"] }));
  await assertFails(change(user(), "user_concerts", "other_other", { ...data, user_id: "other" }));
  await assertFails(change(user(), "schedules", "other", { sets: {} }));
  await assertFails(change(admin(), "schedules", "missing", { sets: {} }));
  await assert.rejects(() => createTableActions(admin()).saveSchedule("other", [{ id: "first1", artist_id: "support" }]), /lineup/);
});


test("retired collections reject reads and writes even for admins", async () => {
  for (const db of [admin(), user(), env.unauthenticatedContext().firestore() as unknown as Firestore]) {
    for (const name of ["venues", "artists", "concerts", "festivals", "users", "user_concerts"]) {
      await assertFails(getDoc(doc(db, name, "legacy")));
      await assertFails(setDoc(doc(db, name, "legacy"), { name: "Retired" }));
    }
  }
});
