// npx tsx --tsconfig tsconfig.app.json --test src/app_x/tests/concertLogs.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
// Component CSS is verified in-browser; Node only needs the rendered markup.
registerHooks({ load(url, context, nextLoad) {
  if (url.endsWith("/data/actions.ts")) return { format: "module", source: 'export function saveLog() { throw new Error("Unexpected write"); }', shortCircuit: true };
  return url.endsWith(".css") ? { format: "module", source: "", shortCircuit: true } : nextLoad(url, context);
} });
const { ConcertDetails } = await import("../components/ConcertDetails");
import { concertLogEntries, concertOwner } from "../data/concertLogs";
import { emptyCatalog, normalizeConcert, normalizeLog, normalizeArtist } from "../data/model";
import type { Catalog } from "../data/model";
const { useLogEditor } = await import("../forms/useLogEditor");
import type { LogEditing } from "../forms/useLogEditor";

const concert = normalizeConcert("show", { artist_id: "head", supporting_artist_ids: ["support"] });
const ownerLog = normalizeLog("owner_show", { user_id: "owner", concert_id: "show", ticket_status: "purchased", supporting_artist_ids: ["support"], notes: "Owner notes" });
const viewerLog = normalizeLog("viewer_show", { user_id: "viewer", concert_id: "show", ticket_status: "sold_out", notes: "Viewer notes" });
const catalog: Catalog = {
  ...emptyCatalog, concerts: [concert], artists: [normalizeArtist("head", { name: "Headliner" }), normalizeArtist("support", { name: "Support" })],
  profiles: [ { id: "dcep93", username: "dcep93", user_id: "owner" }, { id: "visitor", username: "visitor", user_id: "viewer" }, { id: "empty", username: "empty", user_id: "empty" } ],
  logs: [ownerLog, viewerLog],
};
function render(viewerUid?: string, data = catalog) {
  return renderToStaticMarkup(createElement(ConcertDetails, { concert, catalog: data, viewerUid, isAdmin: viewerUid === "owner" }));
}
const main = (html: string) => html.split('<section class="rs-public-entries"')[0];

test("owner resolution and real entry filtering do not depend on the viewer", () => {
  assert.equal(concertOwner(catalog)?.user_id, "owner");
  for (const viewer of [undefined, "owner", "viewer", "empty"]) {
    assert.deepEqual(concertLogEntries(catalog, "show", viewer).map(entry => entry.profile.user_id), ["viewer"]);
  }
  assert.equal(concertOwner({ ...catalog, profiles: [] }), undefined);
  assert.deepEqual(concertLogEntries(catalog, "different"), []);
});

test("hidden own entries remain editable; empty reset editor is retained only for its viewer", () => {
  const hidden = { ...catalog, logs: [ownerLog, { ...viewerLog, removed: true }] };
  assert.equal(concertLogEntries(hidden, "show").length, 0);
  assert.equal(concertLogEntries(hidden, "show", "viewer").length, 1);
  assert.equal(concertLogEntries(hidden, "show", "owner", true).length, 1);
  const cleared = { ...catalog, logs: [ownerLog] };
  assert.equal(concertLogEntries(cleared, "show", "viewer").length, 0);
  assert.equal(concertLogEntries(cleared, "show", "viewer", false, true).length, 1);
  assert.equal(concertLogEntries(cleared, "show", undefined, false, true).length, 0);
  assert.equal(concertLogEntries(cleared, "show", "owner", true, true).length, 0);
});

test("guest and other viewer see the owner's values in disabled main controls", () => {
  for (const viewer of [undefined, "viewer", "empty"]) {
    const html = main(render(viewer));
    assert.match(html, /<select aria-label="Ticket status" disabled="">/);
    assert.match(html, /value="purchased"[^>]*selected=""/);
    assert.match(html, /aria-label="Seen Support" disabled="" checked=""/);
    assert.match(html, /<textarea[^>]*readOnly=""[^>]*>Owner notes<\/textarea>/);
    assert.match(html, /disabled="">Hide/);
    assert(!html.includes("Viewer notes"));
  }
  const owner = main(render("owner"));
  assert.match(owner, /<select aria-label="Ticket status">/);
  assert.match(owner, /aria-label="Seen Support" checked=""/);
  assert(!owner.includes('readOnly=""'));
  assert.equal((render().match(/@dcep93/g) || []).length, 0);
});

test("own entry is inline and editable while other entries stay compact", () => {
  const own = render("viewer").split('<section class="rs-public-entries"')[1];
  assert.match(own, /rs-own-entry/);
  assert.match(own, /<select aria-label="Ticket status">/);
  assert.match(own, /value="sold_out"[^>]*selected=""/);
  assert.match(own, /<textarea[^>]*>Viewer notes<\/textarea>/);
  assert(!own.includes('readOnly=""'));
  assert(!own.includes("Owner notes"));
  const guest = render().split('<section class="rs-public-entries"')[1];
  assert(!guest.includes("<select"));
  assert(!guest.includes("<textarea"));
  assert(guest.includes("Viewer notes"));
});

test("missing owner or override shows read-only defaults, never another user's data", () => {
  for (const data of [{ ...catalog, profiles: catalog.profiles.slice(1) }, { ...catalog, logs: [viewerLog] }]) {
    const html = main(render("viewer", data));
    assert.match(html, /<select aria-label="Ticket status" disabled="">/);
    assert.match(html, /value=""[^>]*selected=""/);
    assert(!html.includes("Owner notes"));
    assert(!html.includes("Viewer notes"));
    assert(!html.includes('checked=""'));
  }
});

test("festival selections display owner checks and separate viewer checks", () => {
  const data = { ...catalog, schedules: [{ id: "show", sets: [{ id: "set", artist_id: "head", day: "2026-10-09" }] }], logs: [{ ...ownerLog, seen_set_ids: ["set"] }, viewerLog] };
  const html = render("viewer", data);
  assert.match(main(html), /aria-label="Seen Headliner[^>]*disabled="" checked=""/);
  const own = html.split('<section class="rs-public-entries"')[1];
  assert.match(own, /aria-label="Seen Headliner/);
  assert(!own.includes('checked=""'));
  assert.doesNotMatch(own, /type="checkbox"[^>]*disabled/);
});

test("read-only persistence is rejected before calling the write action, even if called directly", async () => {
  let editor!: LogEditing;
  function Capture({ uid }: { uid?: string }) {
    // eslint-disable-next-line react/globals -- Capture the hook for this isolated server-render test.
    editor = useLogEditor("show", uid, ownerLog);
    return null;
  }
  for (const uid of [undefined, "viewer"]) {
    renderToStaticMarkup(createElement(Capture, { uid }));
    assert.equal(editor.readOnly, true);
    await editor.persist({ notes: "wrong owner" }, "notes");
    await editor.persist({ ticket_status: "cancelled" }, "controls");
    assert.equal(editor.notes, "Owner notes");
    assert.equal(editor.ticketStatus, "purchased");
  }
  renderToStaticMarkup(createElement(Capture, { uid: "owner" }));
  assert.equal(editor.readOnly, false);
});
