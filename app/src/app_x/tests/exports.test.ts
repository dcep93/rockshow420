import assert from "node:assert/strict";
import test from "node:test";
import { exportUserLog } from "../data/exportLog";
import { exportUserNotes } from "../data/exportNotes";
import { emptyCatalog, normalizeArtist, normalizeConcert, normalizeLog, normalizeVenue } from "../data/model";
import type { Catalog } from "../data/model";

const venue = normalizeVenue("hall", { name: "Hall", timezone: "America/New_York" });
const show = (id: string, date: string, name = id) => normalizeConcert(id, { name, date, date_precision: "day", venue_id: venue.id });
const cutoff = Date.parse("2026-10-10T10:00:00Z"); // 06:00 in New York

test("export adds exactly one blank line at the feed's local 06:00 cutoff", () => {
  const catalog = { ...emptyCatalog, venues: [venue], concerts: [show("Past", "2026-10-09"), show("Future", "2026-10-11")] };
  const original = "Future 10/11 Hall\nPast 10/9 Hall\n2026";
  assert.equal(exportUserLog(catalog, "me", cutoff - 1), original);
  assert.equal(exportUserLog(catalog, "me", cutoff), "Future 10/11 Hall\n\nPast 10/9 Hall\n2026");
  assert.equal(exportUserLog(catalog, "me", cutoff + 7 * 86400000), original);
});

test("export preserves consecutive-night ranges and existing year separators", () => {
  const catalog = { ...emptyCatalog, venues: [venue], concerts: [
    show("past", "2026-10-01", "Earlier"), show("first", "2026-10-09", "Band"), show("last", "2026-10-10", "Band"),
  ] };
  assert.equal(exportUserLog(catalog, "me", cutoff), "Band 10/9-10 Hall\n\nEarlier 10/1 Hall\n2026");
  catalog.concerts = [show("old", "2025-12-31", "Old"), show("new", "2026-11-01", "New")];
  assert.equal(exportUserLog(catalog, "me", cutoff), "New 11/1 Hall\n2026\n\n\nOld 12/31 Hall\n2025");
  assert.equal(exportUserLog(emptyCatalog, "me", cutoff), "");
});

test("multi-day festivals stay upcoming through 06:00 after their final day", () => {
  const catalog = { ...emptyCatalog, venues: [venue], concerts: [
    { ...show("Festival", "2026-10-08"), end_date: "2026-10-11" }, show("Earlier", "2026-10-01"),
  ] };
  assert.equal(exportUserLog(catalog, "me", cutoff), "Festival 10/8-11 Hall\n\nEarlier 10/1 Hall\n2026");
  assert.equal(exportUserLog(catalog, "me", Date.parse("2026-10-12T10:00:00Z")), "Festival 10/8-11 Hall\nEarlier 10/1 Hall\n2026");
});

test("notes export includes only the user's nonempty saved notes, including hidden concerts", () => {
  const catalog: Catalog = { ...emptyCatalog, venues: [venue], concerts: [
    show("older", "2026-10-08", "Older"), show("hidden", "2026-10-09", "Hidden"), show("empty", "2026-10-11", "Empty"),
  ], logs: [
    normalizeLog("mine-old", { user_id: "me", concert_id: "older", notes: "  First line\n\nLast line  " }),
    normalizeLog("mine-hidden", { user_id: "me", concert_id: "hidden", notes: "Hidden note", removed: true }),
    normalizeLog("mine-empty", { user_id: "me", concert_id: "empty", notes: " \n " }),
    normalizeLog("theirs", { user_id: "other", concert_id: "older", notes: "Someone else's note" }),
    normalizeLog("mine-orphan", { user_id: "me", concert_id: "missing", notes: "Keep orphan note", removed: true }),
  ] };
  const before = JSON.stringify(catalog);
  assert.equal(exportUserNotes(catalog, "me"), "Hidden at Hall — Fri, Oct 9, 2026\nHidden note\n\nOlder at Hall — Thu, Oct 8, 2026\n  First line\n\nLast line  \n\nConcert unavailable\nKeep orphan note");
  assert.equal(exportUserNotes(catalog, "nobody"), "");
  assert.equal(exportUserNotes(emptyCatalog, "me"), "");
  assert.equal(JSON.stringify(catalog), before);
});

test("notes headers use artist names and local full dates for timed concerts", () => {
  const catalog: Catalog = { ...emptyCatalog, venues: [venue], artists: [normalizeArtist("band", { name: "Band" })],
    concerts: [normalizeConcert("timed", { artist_id: "band", venue_id: venue.id, date: "2026-10-10T01:00:00Z" })],
    logs: [normalizeLog("note", { user_id: "me", concert_id: "timed", notes: "Great set" })],
  };
  assert.equal(exportUserNotes(catalog, "me"), "Band at Hall — Fri, Oct 9, 2026 · 9:00 PM EDT\nGreat set");
});
