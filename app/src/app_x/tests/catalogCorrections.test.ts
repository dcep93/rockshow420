import test from "node:test";
import assert from "node:assert/strict";
import { cleanSchema } from "../data/cleanSchema";
import { projectCorrections, projectRevisions, type CatalogCorrections } from "../data/catalogCorrections";

function sample() {
  return cleanSchema({
    artists: { a: { name: "A" }, b: { name: "B" } }, venues: { v: { name: "Venue", timezone: "America/New_York" } },
    concerts: { festival: { name: "Festival", date: "2024-05-12T00:00:00Z", date_precision: "day", venue_id: "v", supporting_artist_ids: ["a"] }, ordinary: { date: "2024-05-12T00:00:00Z", date_precision: "day", artist_id: "a", venue_id: "v" } },
    schedules: { festival: { sets: { abc123: { artist_id: "a", day: "2024-05-12" } } } },
    users: { owner: { user_id: "owner", username: "owner" } }, user_concerts: { owner_festival: { user_id: "owner", concert_id: "festival", seen_set_ids: ["abc123"], notes: "Keep" } },
  });
}
const patch: CatalogCorrections = {
  id: "test", artists: {},
  lineup_additions: [{ concert_id: "festival", artist_id: "b", set_id: "def456", set: { artist_id: "b", day: "2024-05-12" }, sources: ["https://example.org/festival"] }],
  concert_updates: [{ id: "ordinary", expected: { date: "2024-05-12T00:00:00Z", date_precision: "day", artist_id: "a", venue_id: "v" }, changes: { date: "2024-05-12T20:00:00-04:00", date_precision: "time" }, sources: ["https://example.org/show"] }],
};

test("catalog corrections are idempotent and preserve personal and unrelated data", () => {
  const before = sample();
  before.concerts.ordinary.setlist_fm_url = "https://www.setlist.fm/setlist/keep.html";
  const result = projectCorrections(before, patch);
  assert.deepEqual(projectCorrections(result, patch), result);
  assert.deepEqual(result.user_concerts, before.user_concerts);
  assert.deepEqual(result.users, before.users);
  assert.equal(result.concerts.ordinary.setlist_fm_url, before.concerts.ordinary.setlist_fm_url);
  assert.equal(before.concerts.ordinary.date_precision, "day");
  assert.deepEqual(result.schedules.festival.sets.abc123, before.schedules.festival.sets.abc123);
  assert.equal(result.schedules.festival.sets.def456.artist_id, "b");
});

test("concurrent research-field edits, reused set IDs and duplicate imported performances fail", () => {
  const changed = sample(); changed.concerts.ordinary.venue_id = "other";
  assert.throws(() => projectCorrections(changed, patch), /edited since research/);
  const changedSet = sample(); changedSet.schedules.festival.sets.def456 = { artist_id: "a", day: "2024-05-12" };
  assert.throws(() => projectCorrections(changedSet, patch), /Conflicting set/);
  const duplicate = sample(); duplicate.schedules.festival.sets.ghi789 = { artist_id: "b", day: "2024-05-12" };
  assert.throws(() => projectCorrections(duplicate, patch), /already scheduled/);
});

const creation: CatalogCorrections = {
  id: "festival-addition", artists: {}, lineup_additions: [], concert_updates: [],
  concert_additions: [{ id: "new123", concert: { name: "New Festival", date: "2021-10-29T16:00:00Z", end_date: "2021-10-31", date_precision: "time", venue_id: "v", artist_id: "", supporting_artist_ids: ["a", "b"] },
    schedule: { sets: { set123: { artist_id: "a", day: "2021-10-29", start: "2021-10-29T12:00:00-04:00" }, set456: { artist_id: "b", day: "2021-10-31" } } }, sources: ["https://example.org/schedule"] }],
};

test("new festival and schedule are atomic, replay-safe and leave every personal record untouched", () => {
  const before = sample();
  const result = projectCorrections(before, creation);
  assert.deepEqual(projectCorrections(result, creation), result);
  for (const name of ["artists", "venues", "users", "user_concerts"] as const) assert.deepEqual(result[name], before[name]);
  for (const [id, concert] of Object.entries(before.concerts)) assert.deepEqual(result.concerts[id], concert);
  for (const [id, schedule] of Object.entries(before.schedules)) assert.deepEqual(result.schedules[id], schedule);
  assert.equal(result.concerts.new123.date.toDate().toISOString(), "2021-10-29T16:00:00.000Z");
  assert.equal(Object.keys(result.schedules.new123.sets).length, 2);
  assert.equal(before.concerts.new123, undefined);
});

test("new concerts reject collisions, duplicate identities and invalid schedule references", () => {
  const changed = sample(); changed.concerts.new123 = changed.concerts.ordinary;
  assert.throws(() => projectCorrections(changed, creation), /Conflicting concert/);
  const orphan = sample(); orphan.schedules.new123 = orphan.schedules.festival;
  assert.throws(() => projectCorrections(orphan, creation), /Orphan schedule/);
  const duplicate = projectCorrections(sample(), creation);
  duplicate.concerts.dup123 = duplicate.concerts.new123; delete duplicate.concerts.new123; delete duplicate.schedules.new123;
  assert.throws(() => projectCorrections(duplicate, creation), /already exists/);
  const badArtist = structuredClone(creation);
  badArtist.concert_additions![0].concert.supporting_artist_ids = ["missing"];
  assert.throws(() => projectCorrections(sample(), badArtist), /Broken artists reference/);
  const badSet = structuredClone(creation);
  badSet.concert_additions![0].schedule!.sets.set123.artist_id = "missing";
  assert.throws(() => projectCorrections(sample(), badSet), /belong to the concert lineup/);
});

test("revision receipts skip later user edits but reject changed files and duplicate IDs", () => {
  const revisions = [{ patch, hash: "first-hash" }, { patch: creation, hash: "second-hash" }];
  const first = projectRevisions(sample(), revisions, {});
  assert.equal(first.pending.length, 2);
  first.prepared.concerts.new123.name = "Admin edited title";
  const replay = projectRevisions(first.prepared, revisions, first.receipts);
  assert.equal(replay.pending.length, 0);
  assert.equal(replay.prepared.concerts.new123.name, "Admin edited title");
  assert.throws(() => projectRevisions(first.prepared, [{ patch: creation, hash: "edited" }], first.receipts), /Previously applied patch changed/);
  assert.throws(() => projectRevisions(sample(), [revisions[0], revisions[0]], {}), /Duplicate/);
  const alreadyApplied = projectCorrections(sample(), patch);
  const onlyNew = projectRevisions(alreadyApplied, revisions, { [patch.id]: "first-hash" });
  assert.equal(onlyNew.pending.length, 1);
  assert.equal(onlyNew.prepared.concerts.new123.name, "New Festival");
});
