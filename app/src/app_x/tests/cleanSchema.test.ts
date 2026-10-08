import test from "node:test";
import assert from "node:assert/strict";
import { cleanSchema } from "../data/cleanSchema";
import type { LegacyBackup } from "../data/migrateTables";

function sample(): LegacyBackup {
  return {
    artists: { artist: { name: "Band" } }, venues: { venue: { name: "Venue", timezone: "America/New_York" } },
    concerts: {
      first: { date: "2025-06-06T23:00:00Z", end_date: "2025-06-08", venue_id: "venue", artist_id: "artist", import_source: { text: "original" }, status: "cancelled" },
      second: { date: "2025-06-09T00:00:00Z", date_precision: "day" },
    },
    festivals: { festival: { name: "Festival", concert_ids: ["first"], start_date: "2025-06-06", end_date: "2025-06-08" } },
    users: { user: { user_id: "uid", username: "user", display_name: "Retired" } },
    user_concerts: { uid_first: { user_id: "uid", concert_id: "first", notes: "Keep this" }, uid_second: { user_id: "uid", concert_id: "second", notes: "", removed: false, ticket_status: "", supporting_artist_ids: [] } },
  };
}

test("cleanup preserves meaning, deletes empty overrides, and leaves its backup untouched", () => {
  const source = sample();
  const cleaned = cleanSchema(source);
  assert.equal(source.concerts.first.status, "cancelled");
  assert.equal(source.users.user.display_name, "Retired");
  assert.equal(cleaned.concerts.first.status, undefined);
  assert.equal(cleaned.concerts.first.import_source, undefined);
  assert.deepEqual(cleaned.user_concerts, { uid_first: { user_id: "uid", concert_id: "first", notes: "Keep this", ticket_status: "cancelled" } });
  assert.equal(cleaned.concerts.first.name, "Festival");
  assert.equal("festivals" in cleaned, false);
  assert.deepEqual(cleaned.schedules, {});
  assert.deepEqual(cleanSchema(cleaned), cleaned);
});

test("legacy cancellations never overwrite a newer explicit personal status", () => {
  for (const ticket_status of ["", "purchased", "sold_out"]) {
    const source = sample();
    source.user_concerts.uid_first.ticket_status = ticket_status;
    assert.throws(() => cleanSchema(source), /conflicting cancellation/);
    assert.equal(source.user_concerts.uid_first.ticket_status, ticket_status);
  }
  const source = sample();
  source.user_concerts.uid_first.ticket_status = "cancelled";
  assert.equal(cleanSchema(source).user_concerts.uid_first.ticket_status, "cancelled");
});

test("cleanup refuses unknown data, lost festival dates, dangling references, and ambiguous owners", () => {
  let source = sample(); source.artists.artist.new_field = "valuable";
  assert.throws(() => cleanSchema(source), /unknown fields/);
  source = sample(); source.festivals.festival.end_date = "2025-06-10";
  assert.throws(() => cleanSchema(source), /Preserve the date range/);
  assert.equal(cleanSchema(source, { confirmedFestivalDates: { festival: { start: "2025-06-06", end: "2025-06-08" } } }).concerts.first.end_date, "2025-06-08");
  source = sample(); source.concerts.first.artist_id = "missing";
  assert.throws(() => cleanSchema(source), /Broken artists reference/);
  source = sample(); source.users.other = { user_id: "other", username: "other" };
  assert.throws(() => cleanSchema(source), /Select the owner/);
});
