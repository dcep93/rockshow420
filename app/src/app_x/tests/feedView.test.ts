import assert from "node:assert/strict";
import test from "node:test";
import { readFeedView, updateFeedView } from "../data/feedView";

test("new feed views start at the top with default filters", () => {
  assert.deepEqual(readFeedView("new-view"), { scrollY: 0, query: "", showHidden: false, searchSetlists: false });
});

test("navigation scroll snapshots preserve filters and filter updates preserve scroll", () => {
  updateFeedView("returning", { query: "lawrence", showHidden: true, searchSetlists: true });
  updateFeedView("returning", { scrollY: 1845 });
  assert.deepEqual(readFeedView("returning"), { scrollY: 1845, query: "lawrence", showHidden: true, searchSetlists: true });
  updateFeedView("returning", { query: "" });
  assert.equal(readFeedView("returning").scrollY, 1845);
});

test("feed memory is isolated per username and callers cannot mutate stored snapshots", () => {
  updateFeedView("alice", { scrollY: 950, query: "band" });
  const snapshot = readFeedView("alice");
  snapshot.scrollY = 0;
  assert.equal(readFeedView("alice").scrollY, 950);
  assert.equal(readFeedView("bob").scrollY, 0);
  assert.equal(readFeedView("bob").query, "");
  const fresh = readFeedView("fresh");
  fresh.query = "changed";
  assert.equal(readFeedView("another-fresh").query, "");
});
