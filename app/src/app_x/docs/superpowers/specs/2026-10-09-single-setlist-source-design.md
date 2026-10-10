# Single setlist source link

Suppress the ordinary concert's footer Setlist.fm link when a nonempty cached headliner setlist provides the source, or when a current supporting artist's setlist already supplies the exact footer URL. Cached headliner sources take precedence over stale concert-level URLs. Keep source links below the songs and retain the footer for uncached, empty, or differently scheduled performances; an unrelated supporting artist setlist must not hide a headliner fallback. Use the synchronously bundled setlist cache so the decision does not flicker while Spotify loads. Initialize song displays from that bundle too, so the retained source is available even if Spotify fails to load. No cache or database edits.

Test source identity, current lineup membership, empty songs, and scheduled-set exclusion. Verify the Sara Bareilles concert from the screenshot and a fallback case; run lint/build and deploy through GitHub.
