# Public-page setlist cache

Approved with `yesi`. Fetch public HTML only, never the setlist.fm API. First seed exactly Khruangbin and Men I Trust at Forest Hills Stadium on 2024-09-21 (app concert 1oahei), matched against the saved production snapshot. Live Firestore reads remain blocked; do not imply the snapshot was freshly verified.

`data/cached.setlist.fm.json` maps `artist_id:concert_id` to structured setlist data. Escape each ID with encodeURIComponent before joining with a colon so arbitrary future IDs cannot collide. Preserve song order, section names, encore boundaries, tape flags, covers/guest links, all song annotations, show notes, tour, artist, venue, event date, reported show times, source URL and edit timestamp. Preserve unclassified annotation text rather than guessing its meaning. Absent fields remain absent. Do not invent an API version ID. Ads, navigation, video buttons, unrelated show timelines and attendee comments are not setlist data.

Use a companion metadata JSON with schema/parser version, fetch timestamps, original HTML hash, content hash and revision history. Store immutable content-addressed JSON revisions alongside the latest cache, so previous captures survive even before a Git commit. Stable serialization and semantic hashes avoid creating revisions for changing ads or retrieval times. Failed or ambiguous fetches leave the last good cache untouched. Requests are sequential, throttled, and stop on errors including 429; no bypasses.

Render an expandable raw JSON block for each cached act below the existing concert details, with its source link. Include supporting acts regardless of personal selections. Render nothing when no cache exists. Keep existing colors and typography; JSON is selectable monospace with bounded overflow. No browser requests to setlist.fm and no Firestore writes.

Seed the same saved app concert and its real artist/venue records in the local emulator only for the preview. The production database is untouched. Do not fetch other concerts until the user reviews the sample. No commit, push, deployment or scheduled refresh.

Verify extraction against both fetched pages; test section/song discrimination, annotations, tape flags, source identity mismatch, revision preservation and no-change refresh. Build/lint and check the concert page and expandable JSON in the browser.
