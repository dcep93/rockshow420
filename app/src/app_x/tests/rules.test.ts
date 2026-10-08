/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  Timestamp,
  updateDoc,
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
    projectId: "demo-rockshow420",
    firestore: {
      host,
      port: Number(port),
      rules: readFileSync(new URL("../backend/firestore.rules", import.meta.url), "utf8"),
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
