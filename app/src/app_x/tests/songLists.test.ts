import assert from "node:assert/strict";
import test from "node:test";
import { artistSongLists, concertSongLists, groupScheduleDays } from "../data/songLists";
import type { PerformanceSetlist, SongCaches, SpotifyTopTracks } from "../data/songLists";

const top: SpotifyTopTracks = { kind: "spotify_top_tracks", artist: "A", url: "https://open.spotify.com/embed/artist/example", songs: [{ name: "Popular" }] };
const performance: PerformanceSetlist = { kind: "setlist_fm", url: "https://www.setlist.fm/setlist/example", sets: [{ songs: [{ name: "Played" }] }] };
const caches: SongCaches = {
  spotify: { a: top, b: { ...top, artist: "B" }, c: { ...top, artist: "C" } },
  setlists: { "a:c": [performance], "b:c": [{ ...performance, url: "https://www.setlist.fm/setlist/support" }] },
  musicals: { musical: { kind: "musical_program", title: "Show", production: "Production", basis: "Published program", url: "https://example.org/program", sets: [{ songs: [{ name: "Number" }] }] } },
};

test("every supporting artist has independent setlists and Spotify tracks, with duplicate artist IDs removed", () => {
  const entries = concertSongLists({ id: "c", artist_id: "a", supporting_artist_ids: ["b", "c", "a"] }, [], caches);
  assert.deepEqual(entries.map(e => [e.title, e.value.kind]), [
    ["a", "setlist_fm"], ["a", "spotify_top_tracks"], ["b", "setlist_fm"], ["b", "spotify_top_tracks"], ["c", "spotify_top_tracks"],
  ]);
});

test("future and unreported concerts retain Spotify independently; musicals need no fake artist", () => {
  const future = concertSongLists({ id: "future", artist_id: "a", supporting_artist_ids: [] }, [], caches);
  assert.equal(future[0].value.kind, "spotify_top_tracks");
  assert.equal(future[0].label, "Top 1 · Spotify");
  assert.equal(concertSongLists({ id: "musical", artist_id: "", supporting_artist_ids: [] }, [], caches)[0].value.kind, "musical_program");
  assert.deepEqual(concertSongLists({ id: "unknown", artist_id: "missing", supporting_artist_ids: [] }, [], caches), []);
});

test("repeated festival appearances match exact schedule IDs, never another performance or an unassigned setlist", () => {
  const festival: SongCaches = { ...caches, setlists: { "a:festival": [
    { ...performance, set_id: "dayone", sets: [{ songs: [{ name: "First day" }] }] },
    { ...performance, set_id: "daytwo", sets: [{ songs: [{ name: "Second day" }] }] },
    performance,
  ] } };
  for (const [id, name] of [["dayone", "First day"], ["daytwo", "Second day"]]) {
    const entries = artistSongLists("festival", "a", "Artist", festival, id);
    assert.equal(entries.length, 2);
    const selected = entries[0].value as PerformanceSetlist;
    assert.equal(selected.set_id, id);
    assert.equal(selected.sets[0].songs[0].name, name);
  }
  assert.deepEqual(artistSongLists("festival", "a", "Artist", festival, "missing").map(e => e.value.kind), ["spotify_top_tracks"]);
  assert.equal((artistSongLists("festival", "a", "Artist", festival)[0].value as PerformanceSetlist).set_id, undefined);
});

test("encoded artist/concert keys and empty song lists do not create missing-data disclosures", () => {
  const encoded: SongCaches = { setlists: { "a%2Fb:c%3Ad": [performance] }, musicals: {}, spotify: {} };
  assert.equal(artistSongLists("c:d", "a/b", "Artist", encoded).length, 1);
  assert.deepEqual(artistSongLists("c", "a", "A", { ...caches, setlists: { "a:c": [{ ...performance, sets: [] }] }, spotify: { a: { ...top, songs: [] } } }), []);
});

test("festival schedule groups by programme day and sorts start times, preserving after-midnight assignments", () => {
  const input = [
    { id: "later", artist_id: "a", day: "2026-07-01", start: "2026-07-02T00:30:00-04:00" },
    { id: "next", artist_id: "b", day: "2026-07-02", start: "2026-07-02T15:00:00-04:00" },
    { id: "unknown", artist_id: "c", day: "2026-07-01" },
    { id: "first", artist_id: "b", day: "2026-07-01", start: "2026-07-01T19:00:00-04:00" },
    { id: "inferred", artist_id: "a", start: "2026-07-02T01:00:00Z" },
  ];
  assert.deepEqual(groupScheduleDays(input, "America/New_York").map(g => [g.day, g.sets.map(s => s.id)]), [
    ["2026-07-01", ["first", "inferred", "later", "unknown"]], ["2026-07-02", ["next"]],
  ]);
  assert.equal(input[0].id, "later", "grouping must not reorder source schedule");
});
