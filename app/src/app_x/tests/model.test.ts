/// <reference types="node" />
import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeConcert,
  normalizeLog,
  normalizeProfile,
  normalizeVenue,
  timestampISO,
  emptyCatalog,
  userConcertRows,
} from "../data/model";
import { isDefaultLog } from "../data/logChanges";
import { formatConcertDate, isTimezone, localTimeOptions, toLocalInput } from "../data/time";

test("normalizers tolerate omitted fields without inventing event dates", () => {
  assert.deepEqual(normalizeConcert("c", {}), {
    id: "c",
    date: "",
    venue_id: "",
    artist_id: "",
    supporting_artist_ids: [],
    setlist_fm_url: "",
  });
  assert.equal(normalizeProfile("someone", { user_id: "u" }).username, "someone");
  assert.equal(normalizeVenue("v", {}).timezone, "");
  assert.deepEqual(normalizeLog("l", { supporting_artist_ids: ["a", 4, "a"] }).supporting_artist_ids, ["a"]);
  assert.equal(timestampISO({ toDate: () => new Date("2026-10-07T20:00:00Z") }), "2026-10-07T20:00:00.000Z");
  for (const value of [
    undefined,
    null,
    0,
    "",
    "bad date",
    {
      toDate: () => {
        throw new Error();
      },
    },
  ])
    assert.equal(timestampISO(value), "");
});
test("dates display in venue timezones and missing data remains visibly missing", () => {
  assert.equal(toLocalInput("2026-07-01T00:00:00Z", "America/New_York"), "2026-06-30T20:00");
  assert.equal(toLocalInput("2026-07-01T00:00:00Z", "Asia/Tokyo"), "2026-07-01T09:00");
  assert.match(formatConcertDate("2026-07-01T00:00:00Z", "America/New_York"), /Jun 30, 2026/);
  assert.equal(formatConcertDate("", "America/New_York"), "Date unavailable");
  assert.equal(toLocalInput("", "UTC"), "");
  assert.equal(isTimezone("fake/place"), false);
});
test("DST gaps are rejected and repeated times return distinct ordered instants", () => {
  assert.deepEqual(localTimeOptions("2026-03-08T02:30", "America/New_York"), []);
  const repeat = localTimeOptions("2026-11-01T01:30", "America/New_York");
  assert.deepEqual(
    repeat.map((item) => item.iso),
    ["2026-11-01T05:30:00.000Z", "2026-11-01T06:30:00.000Z"],
  );
  assert.match(repeat[0].label, /Earlier/);
  assert.match(repeat[1].label, /Later/);
  assert.equal(localTimeOptions("2026-07-01T20:00", "America/New_York").length, 1);
  assert.deepEqual(localTimeOptions("2026-02-30T20:00", "UTC"), []);
  assert.deepEqual(localTimeOptions("", "UTC"), []);
  assert.deepEqual(localTimeOptions("2026-10-07T20:00", "invalid"), []);
});

test("every concert appears by default; only that user's explicit removals hide it", () => {
  const past = normalizeConcert("past", { date: "2025-01-01" });
  const future = normalizeConcert("future", { date: "2027-01-01" });
  const catalog = { ...emptyCatalog, concerts: [past, future], logs: [
    normalizeLog("other_future", { user_id: "other", concert_id: "future", removed: true }),
  ] };
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["future", "past"]);
  catalog.logs.push(normalizeLog("me_past", { user_id: "me", concert_id: "past", notes: "Keep me" }));
  assert.equal(userConcertRows(catalog, "me")[1].log?.notes, "Keep me");
  catalog.logs.push(normalizeLog("me_future", { user_id: "me", concert_id: "future", removed: true }));
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["past"]);
  catalog.concerts.push(normalizeConcert("new", { date: "2028-01-01" }));
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["new", "past"]);
  catalog.logs[2].removed = false;
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["new", "future", "past"]);
  assert.equal(normalizeLog("legacy", {}).removed, false);
});

test("default log records can be removed without losing real or future overrides", () => {
  const defaults = { user_id: "u", concert_id: "c", notes: "", supporting_artist_ids: [], removed: false };
  assert.equal(isDefaultLog(defaults), true);
  assert.equal(isDefaultLog({ user_id: "u", concert_id: "c" }), true);
  for (const change of [
    { notes: "My note" }, { supporting_artist_ids: ["artist"] }, { removed: true },
    { future_rating: 5 }, { future_field: null }, { notes: null }, { supporting_artist_ids: "" },
  ]) assert.equal(isDefaultLog({ ...defaults, ...change }), false);
});
