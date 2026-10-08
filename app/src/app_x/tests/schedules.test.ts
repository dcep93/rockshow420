import test from "node:test";
import assert from "node:assert/strict";
import { emptyCatalog, normalizeConcert, normalizeLog, normalizeSchedule } from "../data/model";
import type { ScheduledSet } from "../data/model";
import { selectedArtistIds, setLabel, validateSchedule } from "../data/schedules";
import { cleanSchema } from "../data/cleanSchema";

const concert = normalizeConcert("concert", { name: "Festival", date: "2026-10-07", date_precision: "day", end_date: "2026-10-08", supporting_artist_ids: ["a", "b"] });
const sets = [{ id: "first1", artist_id: "a", start: "2026-10-07T20:00:00-04:00" }, { id: "second", artist_id: "a", start: "2026-10-08T20:00:00-04:00" }];

test("set validation permits unknown times and repeats but rejects lost identities and invalid times", () => {
  validateSchedule(sets, concert, "America/New_York");
  validateSchedule([{ id: "first1", artist_id: "a" }], concert, "");
  for (const bad of [
    [sets[0], sets[0]], [{ ...sets[0], artist_id: "unknown" }],
    [{ ...sets[0], start: "2026-10-07T20:00" }], [{ ...sets[0], start: "2026-10-10T20:00:00-04:00" }],
    [{ ...sets[0], end: "2026-10-07T19:00:00-04:00" }],
  ]) assert.throws(() => validateSchedule(bad, concert, "America/New_York"));
});

test("schedule normalization preserves programme days and sorts by day, known time, stage, and ID", () => {
  const schedule = normalizeSchedule(concert.id, { sets: {
    undated: { artist_id: "a" },
    later1: { artist_id: "a", day: "2026-10-08" },
    third1: { artist_id: "a", day: "2026-10-07", stage: "B" },
    second: { artist_id: "a", day: "2026-10-07", stage: "A" },
    first1: { artist_id: "a", day: "2026-10-07", stage: "A" },
    night1: { artist_id: "a", day: "2026-10-07", start: "2026-10-08T01:30:00-04:00" },
    timed1: { artist_id: "a", start: "2026-10-07T23:00:00-04:00" },
  } });
  // Untagged timed1 uses its UTC day (October 8); explicit programme days
  // retain October 7 grouping even when their start falls on October 8.
  assert.deepEqual(schedule.sets.map(set => set.id), ["night1", "first1", "second", "third1", "timed1", "later1", "undated"]);
  assert.equal(schedule.sets.find(set => set.id === "first1")?.day, "2026-10-07");
  assert.equal(schedule.sets.find(set => set.id === "night1")?.day, "2026-10-07");
  assert.equal(schedule.sets.find(set => set.id === "timed1")?.day, undefined);
});

test("day-only labels show the programme date while overnight labels retain the exact local start", () => {
  const event = { ...concert, venue_id: "venue" };
  const catalog = { ...emptyCatalog, artists: [{ id: "a", name: "Artist", image: "" }], venues: [{ id: "venue", name: "Venue", timezone: "America/New_York", location: "", image: "" }] };
  assert.equal(setLabel({ id: "first1", artist_id: "a", day: "2026-10-07", stage: "Main" }, catalog, event), "Artist · Wed, Oct 7 · Main");
  assert.equal(setLabel({ id: "first1", artist_id: "a", day: "2026-10-07", start: "2026-10-08T05:30:00Z" }, catalog, event), "Artist · Thu, Oct 8 · 1:30 AM EDT");
  assert.equal(setLabel({ id: "first1", artist_id: "a" }, catalog, event), "Artist");
});

test("sets without programme days sort chronologically across different stored offsets", () => {
  const values = {
    later1: { artist_id: "a", start: "2026-10-07T23:00:00-04:00" },
    early1: { artist_id: "a", start: "2026-10-08T00:00:00Z" },
    middle: { artist_id: "a", start: "2026-10-08T03:00:00+02:00" },
    dayset: { artist_id: "a", day: "2026-10-07" },
    absent: { artist_id: "a" },
  };
  const expected = ["dayset", "early1", "middle", "later1", "absent"];
  for (const entries of [Object.entries(values), Object.entries(values).reverse()]) {
    assert.deepEqual(normalizeSchedule(concert.id, { sets: Object.fromEntries(entries) }).sets.map(set => set.id), expected);
  }
  const equivalentOffsets = { ...values, later1: { ...values.later1, start: "2026-10-08T03:00:00Z" } };
  assert.deepEqual(normalizeSchedule(concert.id, { sets: equivalentOffsets }).sets.map(set => set.id), expected);
});

test("programme days allow unknown times and next-day overnight starts after the festival ends", () => {
  const festival = { ...concert, date: "2024-07-13T00:00:00.000Z", end_date: "2024-07-13" };
  const set = { id: "first1", artist_id: "a", day: "2024-07-13" };
  validateSchedule([set], festival, "");
  validateSchedule([{ ...set, start: "2024-07-13T20:00:00+01:00" }], festival, "Europe/Lisbon");
  validateSchedule([{ ...set, start: "2024-07-14T01:30:00+01:00", end: "2024-07-14T02:30:00+01:00" }], festival, "Europe/Lisbon");
  // The venue's local calendar determines the allowed day, even when the stored offset differs.
  validateSchedule([{ ...set, start: "2024-07-12T23:30:00Z" }], festival, "Europe/Lisbon");
  assert.throws(() => validateSchedule([{ ...set, start: "2024-07-12T22:30:00Z" }], festival, "Europe/Lisbon"), /programme day/);
  assert.throws(() => validateSchedule([{ ...set, start: "2024-07-15T01:30:00+01:00" }], festival, "Europe/Lisbon"), /programme day/);
  assert.throws(() => validateSchedule([{ ...set, start: "2024-07-14T23:30:00Z" }], festival, "Europe/Lisbon"), /programme day/);
});

test("programme days reject invalid, noncanonical, impossible, and out-of-range dates", () => {
  for (const day of ["", "invalid", "2026-10-7", "20261007", "2026-280", "2026-10-07T00:00:00Z", "2026-02-29", "2026-10-32", "2026-13-07", null, 20261007]) {
    assert.throws(() => validateSchedule([{ id: "first1", artist_id: "a", day } as ScheduledSet], concert, "America/New_York"), /YYYY-MM-DD/, String(day));
  }
  for (const day of ["2026-10-06", "2026-10-09"]) {
    assert.throws(() => validateSchedule([{ id: "first1", artist_id: "a", day }], concert, ""), /concert date range/);
  }
  const leapDay = { ...concert, date: "2024-02-29T00:00:00.000Z", end_date: "2024-02-29" };
  validateSchedule([{ id: "first1", artist_id: "a", day: "2024-02-29", start: "2024-03-01T01:30:00Z" }], leapDay, "UTC");
});

test("day support preserves strict legacy bounds, timezone offsets, venue zones, and end ordering", () => {
  const set = { ...sets[0], day: "2026-10-07" };
  assert.throws(() => validateSchedule([{ ...sets[0], start: "2026-10-09T01:30:00-04:00" }], concert, "America/New_York"), /concert date range/);
  assert.throws(() => validateSchedule([{ ...set, start: "2026-10-07T20:00" }], concert, "America/New_York"), /timezone offset/);
  for (const zone of ["", "Not/A_Zone"]) assert.throws(() => validateSchedule([set], concert, zone), /venue timezone/);
  for (const end of [set.start, "2026-10-07T19:00:00-04:00"]) {
    assert.throws(() => validateSchedule([{ ...set, end }], concert, "America/New_York"), /end after/);
  }
  assert.throws(() => validateSchedule([{ id: "first1", artist_id: "a", day: set.day, end: set.start }], concert, "America/New_York"), /end after/);
});

test("nothing selected means no seen artists, and repeated artist appearances remain one log label", () => {
  const catalog = { ...emptyCatalog, schedules: [normalizeSchedule(concert.id, { sets: Object.fromEntries(sets.map(({ id, ...data }) => [id, data])) })] };
  assert.deepEqual(selectedArtistIds(catalog, concert), []);
  assert.deepEqual(selectedArtistIds(catalog, concert, normalizeLog("user_concert", { seen_set_ids: ["first1", "second"] })), ["a"]);
});

test("festival retirement fails closed for multiple concerts and conflicting names", () => {
  const source = { artists: {}, venues: {}, concerts: { c: { name: "Festival", date: "2026-10-07" } }, users: {}, user_concerts: {}, festivals: { f: { name: "Festival", concert_ids: ["c", "c"] } } };
  assert.throws(() => cleanSchema(source), /exactly one/);
  source.festivals.f.concert_ids = ["c"];
  source.festivals.f.name = "Different";
  assert.throws(() => cleanSchema(source), /conflicting festival name/);
});
