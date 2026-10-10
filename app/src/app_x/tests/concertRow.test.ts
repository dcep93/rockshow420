// Run with: npx tsx --tsconfig tsconfig.app.json --test src/app_x/tests/concertRow.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ConcertRow } from "../components/ConcertRow";
import { emptyCatalog, normalizeConcert, normalizeVenue } from "../data/model";
import type { TicketStatus, UserConcert } from "../data/model";

const concert = normalizeConcert("show", { date: "2026-10-09T20:00:00-04:00", venue_id: "venue", name: "Show" });
const catalog = { ...emptyCatalog, venues: [normalizeVenue("venue", { name: "Venue", timezone: "America/New_York" })] };
const cutoff = Date.parse("2026-10-10T06:00:00-04:00");
function dateLine(status?: TicketStatus, now = cutoff - 1, event = concert) {
  const log: UserConcert | undefined = status === undefined ? undefined : {
    id: "log", user_id: "user", concert_id: "show", ticket_status: status,
    removed: false, supporting_artist_ids: [], seen_set_ids: [], notes: "",
  };
  const html = renderToStaticMarkup(createElement(ConcertRow, { catalog, concert: event, log, now }));
  return html.match(/<p class="rs-date">(.*?)<\/p>/)![1];
}

test("upcoming ticket symbols follow the event time; empty and absent overrides add nothing", () => {
  for (const [status, symbol] of [["purchased", "$"], ["sold_out", "%"], ["cancelled", "!"]] as const) {
    const line = dateLine(status);
    assert.match(line, /8:00 PM EDT/);
    assert(line.endsWith(`${symbol}</span>`));
    assert(line.indexOf("8:00 PM EDT") < line.indexOf("<span"));
  }
  assert.match(dateLine("cancelled"), /^\[.*EDT\] <span/);
  assert(!dateLine("").includes("<span"));
  assert.equal(dateLine(), dateLine(""));
});

test("symbols disappear at venue-local 6am; cancellation brackets remain", () => {
  for (const status of ["purchased", "sold_out", "cancelled"] as const) {
    assert(!dateLine(status, cutoff).includes("<span"));
  }
  assert.match(dateLine("cancelled", cutoff), /^\[.*\]$/);
});

test("date-only events get a symbol after their date; invalid dates get none", () => {
  const day = { ...concert, date: "2026-10-09", date_precision: "day" as const };
  assert.match(dateLine("purchased", cutoff - 1, day), /2026 <span[^>]*>\$<\/span>$/);
  assert(!dateLine("purchased", cutoff - 1, { ...concert, date: "" }).includes("<span"));
});

test("event dates link to purchase pages with cancellation and symbols preserved", () => {
  const linked = { ...concert, purchase_link: "https://tickets.example.com/show" };
  const line = dateLine("cancelled", cutoff - 1, linked);
  assert.match(line, /<a class="rs-event-date-link" href="https:\/\/tickets.example.com\/show" target="_blank" rel="noreferrer">\[.*8:00 PM EDT\]<\/a> <span/);
  assert(line.endsWith("!</span>"));
  assert.match(dateLine("purchased", cutoff, linked), /<a /, "purchase links remain available for past events");
  const festival = { ...linked, date: "2026-10-09", date_precision: "day" as const, end_date: "2026-10-11" };
  assert.match(dateLine("", cutoff - 1, festival), /<a .*Fri, Oct 9, 2026 – Sun, Oct 11, 2026<\/a>/);
});

test("missing or unsafe purchase URLs and unknown dates stay plain text", () => {
  for (const purchase_link of [undefined, "", "javascript:alert(1)", "data:text/html,hello"]) {
    assert(!dateLine("", cutoff - 1, { ...concert, purchase_link }).includes("<a "));
  }
  assert(!dateLine("", cutoff - 1, { ...concert, date: "", purchase_link: "https://tickets.example.com/show" }).includes("<a "));
});
