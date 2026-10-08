# Setlist cache

`data/cached.setlist.fm.json` is static data keyed by `encodeURIComponent(artist_id) + ':' + encodeURIComponent(concert_id)`. All saved headliners and supporting artists are eligible, regardless of personal selections. See [the discovery report](setlist-fetch-report.md) and `setlist-fetch-progress.json` for complete coverage and unresolved matches.

## Compact schema 4

Each value is an array of performances. Every performance has `kind: "setlist_fm"`, `url` and ordered `sets`. Each set has `songs`, an optional source `name`, and optional `encore: true`. Songs have `name`, optional `notes` (original cover/guest/arrangement wording), and optional `tape: true`. Whole-show notes use the optional top-level `notes` string. Festival performances additionally carry `set_id`, referencing the existing schedule row; ordinary performances omit it. Refreshing one set leaves its siblings intact. Missing facts stay absent. Section headings are not songs. There are no video controls, HTML classes, statistics, duplicate venue/artist facts, or webpage editing metadata in this payload.

The source URL points to the exact public setlist.fm page. No API is used. This is what the page reports; an available setlist may still be incomplete. No data is invented for blank pages, upcoming shows, ambiguous performances, or events without artist IDs.

## History

The current Khruangbin entries use this compact schema. Original verbose captures survive only as immutable historical revisions; the app does not import that directory or the metadata files.

- `cached.setlist.fm.meta.json`: schema/parser versions, first/latest successful fetch time, per-source captured HTML/DOM hashes and fetch times, processing time, current performance-array content hash, and revision history.
- `setlist-history/<sha256>.json`: immutable content revisions, including the original verbose sample. Schema migration preserves those old revisions and adds compact ones.
- `setlist-sources.json`: matched app IDs, public URLs, and expected artist/date/venue identities.

Unchanged content updates the successful fetch timestamp without duplicating history. Empty, failed, or conflicting sources never erase existing cached content. Each JSON file is replaced atomically, after all supplied captures parse successfully. Only one writer may run at a time. Verify all hashes after interruption and before release. Repository release follows the workspace commit/push policy.

## Requested monthly refresh

Use a fresh decoded catalog JSON with each table mapping IDs to records. Do not reuse the October snapshot as though it were current production data. Start the local browser-capture queue from the repository root:

```sh
python3 app/src/app_x/scripts/setlist_browser_queue.py --catalog /absolute/path/current-catalog.json --work /absolute/path/dated-refresh-output --refresh
```

Open `http://127.0.0.1:8777/` and follow its public source link in a normal browser. Capture rendered `.setlistInfo`, `.setlistPaper`, and `.relatedVenueSetlists` DOM for setlist pages, or `h1,h2,p` for searches. Paste that HTML into the local form. This local server never fetches remote pages. It validates artist, venue and local date, then publishes the compact data. Stop for source access challenges; do not bypass them. Search pages require actual result links or an explicit no-results message. Re-running with the same work directory resumes progress; `--refresh` revisits all targets while retaining cache/history. Stop the server when finished.

The initial run used the saved October 8 production snapshots and correction/time overlays because live Firestore was quota-blocked. Its local work directory is `/Users/danielcepeda/repos/_codex_output/rockshow420/setlist-bulk-2026-10-08`. Raw captured markup stays there, outside the app bundle.

For already matched public pages, `refresh_setlists.py data/setlist-sources.json` (using the full repo-relative manifest path) supports sequential public HTML retrieval at two-second intervals. Stop on a challenge or rate limit and use the normal browser workflow. No API fallback. Its `--html-dir` option accepts offline `<artist_id>.html` captures for ordinary shows and `<artist_id>-<set_id>.html` for festival performances. There is no scheduled job: refresh only when requested.

## Verification and display

Two other independent static caches render in the same disclosure list:

- `cached.spotify.json`: artist-ID keys, `kind: "spotify_top_tracks"`, public source URL, artist name, and ranked songs with artist credits and optional `explicit: true`. These are the public artist embed's current top tracks, not the event setlist or an all-time ranking. If Spotify exposes fewer than five, preserve the actual count. Future concerts and all supporting artists are included. Missing or ambiguous identities stay absent.
- `cached.musicals.json`: concert-ID keys, `kind: "musical_program"`, title, production, source URL, basis/limitations, and ordered program sections. Published production programs are explicitly distinguished from verified performance reports. No artificial artist IDs are created.

Both have separate `.meta.json` manifests and immutable `song-source-history/<sha256>.json` revisions. Refresh timestamps are metadata, not repeated in every concert. The source caches never write Firestore. `docs/song-sources-review.md` records coverage, identity exceptions, and production-program caveats.

Spotify refreshes use only ordinary public HTML, never Spotify APIs. Start from the current catalog and saved verified artist URLs; fetch each public embed sequentially, validate the artist heading and ranked rows with `song_sources.spotify_tracks`, then publish with `publish_sources`. `collect_spotify.py` handles saved search candidates; `spotify_credits.py` can resolve missing profiles through public song credits, and `resolve_spotify.py` can corroborate ambiguous identities against saved performance songs. A changed identity requires review, not automatic replacement. Retain prior valid data on empty/failed pages and stop on access challenges or HTTP 403/429. Save raw captures outside the repo bundle. No scheduled refresh is installed.

```sh
python3 -m unittest discover -s app/src/app_x/tests -p 'test_*.py'
```

Run `npm run build` and `npm run lint` from `app`. The cache loads as a separate content-hashed Vite chunk on concert pages. Numbered song disclosures sit below ordinary artists or inside festival schedule rows grouped by programme day. Spotify has a separate collapsed Top N disclosure. Source links, encores, annotations and musical production caveats remain visible when expanded; raw JSON is not rendered. This feature makes no Firestore reads or writes and never contacts setlist.fm from the app.

The demo emulator preview has the sample at `/concert/1oahei/khruangbin-at-forest-hills-stadium`, including Men I Trust. Production uses the six table documents; music caches remain static build assets.

Spotify parser version 3 caps saved lists at five tracks (or fewer if the source lists fewer). The October 8 conversion reused existing fetched data, preserves `last_fetched_at`, records `last_processed_at`, and adds immutable revisions; it does not claim a new source fetch. Artist lists are linked alongside performance setlists via `artist_id`, without duplicating tracks into every performance record.

Schema 4 migration retains all prior immutable revisions, binds existing festival performances to reviewed schedule IDs, and hashes the complete array. Festival discovery accepts only one-to-one source/schedule matches; overlapping same-day and overnight candidates remain held. Saved festival HTML uses its original capture file timestamp as fetch provenance, with a separate processing timestamp. Preserve those capture timestamps when copying archival files. See `performance-song-lists-report.md` for the follow-up results.
