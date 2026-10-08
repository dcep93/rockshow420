import assert from "node:assert/strict";
import test from "node:test";
import { concertSongLists } from "../data/songLists";
import type { SongCaches, SpotifyTopTracks } from "../data/songLists";

const top: SpotifyTopTracks = { kind: "spotify_top_tracks", artist: "A", url: "https://open.spotify.com/embed/artist/example", songs: [{ name: "Popular" }] };
const caches: SongCaches = {
  spotify: { a: top, b: { ...top, artist: "B" } },
  setlists: { "a:c": { kind: "setlist_fm", url: "https://www.setlist.fm/setlist/example", sets: [{ songs: [{ name: "Played" }] }] } },
  musicals: { musical: { kind: "musical_program", title: "Show", production: "Production", basis: "Published program", url: "https://example.org/program", sets: [{ songs: [{ name: "Number" }] }] } },
};

test("setlists and ranked tracks remain distinct, including every supporting act", () => {
  const entries = concertSongLists({ id: "c", artist_id: "a", supporting_artist_ids: ["b", "a"] }, [], caches);
  assert.deepEqual(entries.map(e => e.value.kind), ["setlist_fm", "spotify_top_tracks", "spotify_top_tracks"]);
  assert.deepEqual(entries.map(e => e.label), ["setlist.fm", "Spotify top 1", "Spotify top 1"]);
});

test("future/unreported concerts still show artist tracks; musicals need no fake artist", () => {
  assert.equal(concertSongLists({ id: "future", artist_id: "a", supporting_artist_ids: [] }, [], caches)[0].value.kind, "spotify_top_tracks");
  assert.equal(concertSongLists({ id: "musical", artist_id: "", supporting_artist_ids: [] }, [], caches)[0].value.kind, "musical_program");
  assert.deepEqual(concertSongLists({ id: "unknown", artist_id: "missing", supporting_artist_ids: [] }, [], caches), []);
});
