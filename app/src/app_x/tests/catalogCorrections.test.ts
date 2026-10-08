import test from "node:test";
import assert from "node:assert/strict";
import { cleanSchema } from "../data/cleanSchema";
import { projectCorrections, type CatalogCorrections } from "../data/catalogCorrections";

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
