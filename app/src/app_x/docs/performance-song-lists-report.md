# Performance song lists — 2026-10-08

## Delivered behavior

Ordinary concert artists and festival schedule rows have compact, independently expandable numbered songs and Spotify top-five lists. Festivals group rows by programme day; each cached performance references its existing schedule set ID. Source links, section/encore headings, song annotations, tape flags, and musical production caveats remain available. No raw JSON or duplicate full lineup is rendered.

Cache schema 4 retains `artist_id:concert_id` keys with arrays of performances. All old immutable revisions survive. A partial refresh updates one performance without removing its siblings. Original capture times stay separate from processing times. No music API or additional Firestore table is used.

## Verified additions

- **35 performance setlists / 451 songs:** 34 previously held festival performances recovered from saved captures, plus Ginger Root's eight-song Kilby set. Total: **902 artist/concert keys, 916 performances, 12,206 songs**.
- **Seven Spotify profiles:** Collectivity, Slap Dragon, ZOLA, Badfish, Locus Pocus, LAW, and Ginger Root. Each has five saved ranked tracks. Total: **1,194 artist profiles**.
- **Two ordinary showtimes:** Meet Me @ the Altar at Mercury Lounge, January 31, 2026, **7:20 PM EST**; John Mayer at Chase Center, September 16, 2019, **7:30 PM PDT scheduled** (the source separately reports a later actual start).
- **Two lineup additions:** Ginger Root at Kilby, May 12, 2024, **7:30 PM MDT, Desert Stage**; Hot Flash Heat Wave at Sonoma, September 22, 2019, **day-only**.

Time sources: [Meet Me @ the Altar](https://www.setlist.fm/setlist/meet-me-the-altar/2026/mercury-lounge-new-york-ny-434c7347.html), [John Mayer](https://www.setlist.fm/setlist/john-mayer/2019/chase-center-san-francisco-ca-b9ced3e.html). Festival sources: [Ginger Root performance](https://www.setlist.fm/setlist/ginger-root/2024/utah-state-fairpark-desert-stage-salt-lake-city-ut-23a890e7.html), [Kilby lineup announcement](https://www.brooklynvegan.com/kilby-block-party-2024-lineup-lcd-soundsystem-postal-service-vampire-weekend-joanna-newsom-css-more/), [Sonoma's Hot Flash Heat Wave artist page](https://sonomaharvestmusicfestival.com/artist/hot-flash-heat-wave/), [Sonoma weekend-two performance directory](https://www.setlist.fm/festival/2019/sonoma-harvest-music-festival-2019-weekend-2-6bd71a46.html).

## Remaining gaps

- **134 ordinary date-only events.** This focused follow-up found two additional verified times; the remaining count does not mean every event was exhaustively re-researched. Lawrence's New Year's Eve listing has two showtimes, so it remains unresolved without knowing which performance was attended. Doors-only and other ambiguous evidence were not promoted to showtimes.
- **27 ordinary artist Spotify gaps; 194 across the full catalog.** Profiles without ranked songs and uncertain artist identities remain absent. The seven additions were checked against official artist/label links or distinctive corroborated discographies; no same-name guess was accepted.
- **Festival setlists:** 631 fully cached artist/concert pairs, 6 partial, 361 matching pages without usable songs, 36 ambiguous pairs, 216 absent from the observed directory, and 81 excluded for canceled BottleRock 2020. Of the original 69 held pairs, 14 became fully cached, 6 partial, 6 empty, 7 absent, and 36 remain ambiguous. One partial pair also has an unresolved source association, so **37 pairs have held URLs**.
- **Sonoma:** Hot Flash Heat Wave's performance is supported but its public setlist is empty. Nightly stays in the announced lineup: no confirmed replacement evidence justifies deleting it or transferring its 11:30 AM slot.

Per-entry evidence and outstanding investigations are in `ordinary-enrichment-evidence-2026-10-08.json`, `festival-setlist-progress.json`, and `spotify-festival-enrichment.json`.

## Release safeguards and validation

GitHub uploads a fresh database backup before applying the reviewed catalog patch. The patch validates expected original fields, preserves unrelated fields and all user records, uses atomic update-time preconditions, and records an immutable revision receipt so later deployments do not undo user edits. Existing schedule IDs and personal selections remain unchanged.

The production-data dry run projects 1,388 artists, 354 concerts, 14 schedules containing 1,389 rows, 94 venues, one user and 35 unchanged personal overrides. Cache integrity and matching tests, UI selection tests, catalog patch tests, permission emulator tests, lint/build, and ordinary/festival browser checks cover this release. The GitHub run provides backup and verified deployment artifacts.
