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
  isTicketStatus,
} from "../data/model";
import { isDefaultLog } from "../data/logChanges";
import { exportUserLog } from "../data/exportLog";
import { concertPeriod, formatConcertDate, isTimezone, localTimeOptions, toLocalInput } from "../data/time";

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

test("date-only imports keep their calendar day in every timezone and preserve festival ranges", () => {
  const concert = normalizeConcert("festival", { name: "Outside Lands", date: "2019-08-09T00:00:00Z", date_precision: "day", end_date: "2019-08-11" });
  for (const zone of ["America/Los_Angeles", "America/New_York", "Asia/Tokyo"]) {
    const label = formatConcertDate(concert.date, zone, concert.date_precision, concert.end_date);
    assert.equal(label, "Fri, Aug 9, 2019 – Sun, Aug 11, 2019");
    assert.doesNotMatch(label, /AM|PM/);
  }
  assert.equal(concert.name, "Outside Lands");
  assert.equal(concert.artist_id, "");
});

test("upcoming and past use the show instant or final venue-local day", () => {
  const show = normalizeConcert("show", { date: "2026-10-08T00:00:00Z" });
  assert.equal(concertPeriod(show, "America/New_York", Date.parse("2026-10-07T23:59:59Z")), "upcoming");
  assert.equal(concertPeriod(show, "America/New_York", Date.parse("2026-10-08T00:00:00Z")), "past");
  const day = normalizeConcert("day", { date: "2026-10-07", date_precision: "day" });
  const sameInstant = Date.parse("2026-10-08T02:00:00Z");
  assert.equal(concertPeriod(day, "America/New_York", sameInstant), "upcoming");
  assert.equal(concertPeriod(day, "Asia/Tokyo", sameInstant), "past");
  const festival = normalizeConcert("festival", { date: "2026-10-30", date_precision: "day", end_date: "2026-11-01" });
  assert.equal(concertPeriod(festival, "America/New_York", Date.parse("2026-11-02T04:59:59Z")), "upcoming");
  assert.equal(concertPeriod(festival, "America/New_York", Date.parse("2026-11-02T05:00:00Z")), "past");
  assert.equal(concertPeriod(normalizeConcert("missing", {}), "UTC", sameInstant), "unknown");
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
  const expanded = userConcertRows(catalog, "me", true);
  assert.deepEqual(expanded.map((row) => row.concert?.id), ["future", "past"]);
  assert.equal(expanded[0].log?.removed, true);
  assert.equal(userConcertRows(catalog, "other").some((row) => row.concert?.id === "past"), true);
  catalog.concerts.push(normalizeConcert("new", { date: "2028-01-01" }));
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["new", "past"]);
  catalog.logs[2].removed = false;
  assert.deepEqual(userConcertRows(catalog, "me").map((row) => row.concert?.id), ["new", "future", "past"]);
  assert.equal(normalizeLog("legacy", {}).removed, false);
});

test("default log records can be removed without losing real or future overrides", () => {
  const defaults = { user_id: "u", concert_id: "c", notes: "", supporting_artist_ids: [], removed: false };
  assert.equal(isDefaultLog(defaults), true);
  assert.equal(isDefaultLog({ ...defaults, ticket_status: "" }), true);
  assert.equal(isDefaultLog({ user_id: "u", concert_id: "c" }), true);
  for (const change of [
    { notes: "My note" }, { supporting_artist_ids: ["artist"] }, { removed: true },
    { future_rating: 5 }, { future_field: null }, { notes: null }, { supporting_artist_ids: "" },
    { ticket_status: "purchased" }, { ticket_status: "sold_out" }, { ticket_status: null },
  ]) assert.equal(isDefaultLog({ ...defaults, ...change }), false);
});

test("ticket status defaults to empty and accepts only the enum values", () => {
  for (const ticket_status of ["", "purchased", "sold_out"]) {
    assert.equal(isTicketStatus(ticket_status), true);
    assert.equal(normalizeLog("l", { ticket_status }).ticket_status, ticket_status);
  }
  assert.equal(normalizeLog("legacy", {}).ticket_status, "");
  for (const ticket_status of [undefined, null, "empty", "Purchased", "sold out", false, 0, []]) {
    assert.equal(isTicketStatus(ticket_status), false);
    assert.equal(normalizeLog("l", { ticket_status }).ticket_status, "");
  }
});

test("clipboard export uses personal status, local dates, trailing years and matching consecutive nights", () => {
  const catalog = {
    ...emptyCatalog,
    artists: [{ id: "a", name: "Band", image: "" }, { id: "b", name: "Opener", image: "" }],
    venues: [normalizeVenue("v", { name: "Hall", timezone: "America/New_York" })],
    concerts: [
      normalizeConcert("1", { date: "2026-11-06T01:00:00Z", artist_id: "a", venue_id: "v", supporting_artist_ids: ["b"] }),
      normalizeConcert("2", { date: "2026-10-29", date_precision: "day", artist_id: "a", venue_id: "v" }),
      normalizeConcert("3", { date: "2026-10-30", date_precision: "day", artist_id: "a", venue_id: "v" }),
      normalizeConcert("4", { date: "2026-10-31", date_precision: "day", artist_id: "a", venue_id: "v" }),
      normalizeConcert("old", { date: "2025-12-31", date_precision: "day", name: "Festival", end_date: "2026-01-02" }),
      normalizeConcert("hidden", { date: "2028-02-01", date_precision: "day", name: "Hidden" }),
    ],
    logs: [
      normalizeLog("u1", { user_id: "u", concert_id: "1", ticket_status: "purchased", supporting_artist_ids: ["b"] }),
      ...["2", "3", "4"].map((concert_id) => normalizeLog(`u${concert_id}`, { user_id: "u", concert_id, ticket_status: "sold_out" })),
      normalizeLog("uh", { user_id: "u", concert_id: "hidden", removed: true }),
      normalizeLog("other", { user_id: "other", concert_id: "old", removed: true, ticket_status: "purchased" }),
    ],
  };
  const expected = "$Band + Opener 11/5 Hall\n%Band 10/29-31 Hall\n2026\n\n\nFestival 12/31/2025-1/2/2026\n2025";
  assert.equal(exportUserLog(catalog, "u"), expected);
  assert.equal(exportUserLog({ ...catalog, concerts: [...catalog.concerts].reverse(), logs: [...catalog.logs].reverse() }, "u"), expected);
  assert.equal(exportUserLog(emptyCatalog, "u"), "");
});

test("export never merges across hidden dates, differing statuses, venues or year boundaries", () => {
  const concert = (id: string, date: string, venue_id = "v") => normalizeConcert(id, { date, date_precision: "day", name: "Show", venue_id });
  const catalog = {
    ...emptyCatalog,
    venues: [normalizeVenue("v", { name: "Hall" }), normalizeVenue("w", { name: "Elsewhere" })],
    concerts: [concert("1", "2026-10-29"), concert("2", "2026-10-30"), concert("3", "2026-10-31"), concert("4", "2026-11-01", "w"), concert("5", "2026-12-31"), concert("6", "2027-01-01")],
    logs: [normalizeLog("hidden", { user_id: "u", concert_id: "2", removed: true })],
  };
  assert.equal(exportUserLog(catalog, "u"), "Show 1/1 Hall\n2027\n\n\nShow 12/31 Hall\nShow 11/1 Elsewhere\nShow 10/31 Hall\nShow 10/29 Hall\n2026");
  catalog.logs = [normalizeLog("sold", { user_id: "u", concert_id: "2", ticket_status: "sold_out" })];
  assert.match(exportUserLog(catalog, "u"), /Show 10\/31 Hall\n%Show 10\/30 Hall\nShow 10\/29 Hall/);
});

test("export handles month-spanning ranges and rejects incomplete data instead of silently dropping it", () => {
  const catalog = { ...emptyCatalog, concerts: [normalizeConcert("f", { name: "Festival", date: "2024-02-28", date_precision: "day", end_date: "2024-03-02" })] };
  assert.equal(exportUserLog(catalog, "u"), "Festival 2/28-3/2\n2024");
  assert.throws(() => exportUserLog({ ...catalog, concerts: [normalizeConcert("bad", {})] }, "u"));
  assert.throws(() => exportUserLog({ ...emptyCatalog, logs: [normalizeLog("orphan", { user_id: "u", concert_id: "missing" })] }, "u"));
});
