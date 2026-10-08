# Festival setlist research — 2026-10-08

The research pass uses the imported festival schedules, including each performance's programme day and documented overnight date. It reads complete public festival directories and every matching artist's linked performance pages. No music API is used. BottleRock 2020 is excluded because it was canceled.

Publication preserves the existing `artist_id:concert_id` key. A pair is published only after all its candidate pages have been captured, the artist and performance day match, and the source contains a backlink to the exact festival edition. Satellite venues and stages are accepted through that explicit festival membership. Repeated schedule artists and multiple matching source performances are retained as ambiguous evidence instead of overwriting one another.

`festival-setlist-progress.json` records every current artist/concert pair. `absent_from_directory` means no artist-name match in the complete observed festival directory; it is not an exhaustive artist/date search and does not prove no setlist exists. `unvisited` means candidate pages have not yet been captured. `empty_or_parser_review` preserves the exact parser reason. Final numeric coverage is recorded separately after the capture pass.

Evidence is retained in `_codex_output/rockshow420/festival-setlists-2026-10-08`. Browser captures contain DOM excerpts of the full setlist identity, song sections, annotations, festival links, and reported times. Directory captures preserve all visible performance links and the site's declared count; incomplete captures are rejected. Early full-page captures include unrelated script content, sometimes truncated only after all visible directory links; those originals remain evidence. Large incomplete directory captures are retained separately and replaced with complete DOM excerpts before matching.

Ordinary HTTP requests stop on 403/429 or challenge-only pages. A WAF library script by itself is not a challenge: valid pages include that script too. When ordinary requests encountered an actual challenge, research continued through normal Chrome page navigation. No challenge solving, bypass, credential extraction, or API endpoint was used.

## Reviewed artist-name variants

Only these explicit variants extend punctuation/diacritic normalization. Similar names such as MPHD and MPH are not merged.

| Catalog name | Public source name | Evidence |
|---|---|---|
| AJNA (US) | Ajna | [Berklee's 2018 festival artist announcement](https://college.berklee.edu/news/bpmi-showcases-its-2018-festival-artists-sinclair-march-6); country qualifier omitted by source |
| Altin Gün | Altın Gün | Turkish dotted/dotless spelling variant in the same festival edition |
| Full Moonalice | Moonalice | [Band's Full Moonalice tour announcement](https://www.moonalice.com/news/full-moonalice-tour-returns) |
| JD Twitch (Optimo) | JD Twitch | [Official Optimo links](https://linktr.ee/optimoespacio); parenthetical affiliation omitted |
| Luttrell | Eric Luttrell | [Artist biography describing the 2026 rebrand](https://ericluttrell.squarespace.com/bio) |
| Mob Rich | Moby Rich | [AllMusic biography and former name](https://www.allmusic.com/artist/mob-rich-mn0004007630) |
| TAGABOW | They Are Gutting a Body of Water | [Band’s label artist page](https://atorecords.com/artists/they-are-gutting-a-body-of-water/) |
| Petey | Petey USA | [Artist's AMA discussing the rebrand](https://www.reddit.com/r/indieheads/comments/1o6jowm/hi_im_musician_petey_usa_ask_me_anything/) |
| SF Gay Men’s Chorus | San Francisco Gay Men’s Chorus | Expanded city abbreviation in the same festival edition |

The stale All Things Go 2025 search result returned a 404 in the live browser. The current [festival directory](https://www.setlist.fm/festival/2025/all-things-go-nyc-2025-23d540d3.html) was recovered from Griff's actual performance-page festival backlink.

## Reproduce

Run `festival_setlist_browser.py --catalog <decoded-catalog.json> --work <evidence-directory>` to expose a loopback-only capture form at `http://127.0.0.1:8778`. Read the displayed public source through the ordinary browser, capture only rendered DOM, and submit it to the local form. The form does not fetch external sources. Verify source identity and canonical setlist ID before saving; do not submit truncated browser strings.

Then run `festival_setlists.py --catalog <decoded-catalog.json> --work <evidence-directory> --offline`. This validates captured sources, publishes unambiguous compact data with immutable revision history, and records unvisited candidates without making network requests. Run the existing Python setlist tests and `test_festival_setlists.py` after changes.
