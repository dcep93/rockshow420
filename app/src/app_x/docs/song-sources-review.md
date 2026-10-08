# Song sources and database review — October 8, 2026

> **Festival enrichment update (October 8):** The expanded 1,387-artist catalog now has 1,187 Spotify lists (900 additions), with 200 explicit unresolved/unavailable cases. All 287 prior payloads are preserved. See [the complete current Spotify review](spotify-festival-enrichment.md). The snapshot counts below document the earlier 320-artist pass.

**Scope:** saved production snapshot plus correction/time overlays. Live Firestore reads are quota-blocked. These counts do not claim a fresh production audit. Nothing was committed, pushed, or deployed.

- 265 reported setlists across 208 concerts, all `kind: "setlist_fm"`.
- 287 of 320 artists have Spotify lists, including future headliners and supporting acts; 1431 ranked song entries, capped at five per artist. Spotify is a present-day popularity list, not an event setlist.
- 3 musical production programs, explicitly marked `kind: "musical_program"`.
- No service APIs used. Each current payload has a public source URL; retrieval times and revisions live in separate metadata.

## Musical limitations

| Production | Saved list | Limitation |
|---|---:|---|
| Hamilton, SF 2019 | 34 printed numbers | Official February–April program, while the saved event is September 11. Omits/groups some passages; not a complete cast-album list or exact-performance verification. |
| Phantom, SF 2018 | 18 grouped numbers | Official 2013–2020 tour program. The September 9 matinee/evening performance is not identified. |
| Illinoise, Broadway 2024 | 20 numbers | Official Broadway production song list; exact closing-day performance remains unverified. |

Sources are linked directly from each record in `cached.musicals.json`. Gatz, Glengarry Glen Ross and Life and Trust are not treated as musicals. Toy Story in Concert is an orchestral film screening; no invented song-by-song performance list was added. Festivals remain pending lineup work.

## Spotify exceptions

The following profiles were not confidently matched or did not expose a ranked list. Missing means not located in this pass, not proof that no Spotify profile exists.

| Artist | Result |
|---|---|
| Alina Kobialka | No confirmed matching profile |
| Arielle Lana | No confirmed matching profile |
| Badfish | No confirmed matching profile |
| Beau Beau Honeydrops | No confirmed matching profile |
| Bob Weir & Wolf Bros | No confirmed matching profile |
| Bushwick’s Dead | No confirmed matching profile |
| Collectivity | No confirmed matching profile |
| Dan Bar-Hava | No confirmed matching profile |
| Daniel Donato’s Cosmic Country | No confirmed matching profile |
| Friendless Summer | No confirmed matching profile |
| High Time | No confirmed matching profile |
| Jacob Aviner | No confirmed matching profile |
| Joe Russo’s Almost Dead | No confirmed matching profile |
| John Kadlecik | No confirmed matching profile |
| Johnson and Johnson | No confirmed matching profile |
| Law | Same-name artists; identity needs confirmation |
| Live Dead & Brothers | No confirmed matching profile |
| Locus Pocus | No confirmed matching profile |
| Musicians from Marlboro | No confirmed matching profile |
| Near Dead Experience | No confirmed matching profile |
| Night Animals | No confirmed matching profile |
| Not Our First Goat Rodeo | No confirmed matching profile |
| Not-Porterfield | No confirmed matching profile |
| Oliver Herbert | Profile found, but public embed has no ranked tracks |
| Questlove | No confirmed matching profile |
| Slap Dragon | No confirmed matching profile |
| The Latin Dead | No confirmed matching profile |
| Trey Anastasio Band | No confirmed matching profile |
| unTame Impala | No confirmed matching profile |
| Walrus | Same-name artists; identity needs confirmation |
| Weird Phishes | No confirmed matching profile |
| Whateverglades | No confirmed matching profile |
| ZOLA | Same-name artists; identity needs confirmation |

Decisions worth making:

- Should band-specific entries such as Bob Weir & Wolf Bros, Trey Anastasio Band, Daniel Donato’s Cosmic Country and Not Our First Goat Rodeo use the individual artist’s Spotify catalog? Currently they do not inherit it.
- Law, Walrus and ZOLA need confirmed artist identities. The saved shows are listed below. Local/tribute acts may have no suitable Spotify recordings; original artists are never silently substituted.
- King Gizzard’s public profile currently exposes only one ranked track (a Confidence Man remix). The other 286 matched artists now have five saved tracks each. The app labels the actual count rather than padding a “top 5.”
- BERTHA is matched to BERTHA: Grateful Drag through its official profile; Tragedy is matched to the Bee Gees/disco-metal tribute band, not the rapper or hardcore band. LaMP is the Lawton/Metzger/Paczkowski trio, not the Japanese band Lamp.
- Some artists have duplicate Spotify profiles sharing a catalog (e.g. Infinity Song, Now, Now, Robert Glasper). Official release links or track credits choose the stored profile; the chosen identity evidence is in `spotify-fetch-progress.json`.

| Date | Event | Venue | ID |
|---|---|---|---|
| 2020-02-21 | Law (supporting act) | Cornerstone | `cy81x9` |
| 2020-01-23 | ZOLA | Swedish American Hall | `jwehc9` |
| 2023-07-01 | Walrus | Brooklyn Bowl | `yh0ze9` |

## Setlist matches still needing review

These are source/date/identity exceptions from the earlier public-page pass. Spotify availability does not resolve a missing performance setlist.

| Artist | Event date | Concert | Reason |
|---|---|---|---|
| Law | 2020-02-21 | `cy81x9` | Saved: Cornerstone; source: Unwritten Law at Leisure Inn, Rockingham, Australia |
| Lawrence | 2024-12-31 | `oaapht` | Saved: City Winery New York; source: Lawrence at City Winery Vineyard, New York, NY, USA |
| Rise Against | 2021-08-22 | `m058sl` | Saved: Bill Graham Civic Auditorium; source: Rise Against at Masonic Auditorium, San Francisco, CA, USA |
| Robert Glasper | 2023-11-04 | `mwjwjj` | Saved: Brooklyn Music School; source: Robert Glasper at Blue Note Jazz Club, New York, NY, USA |
| Tash Sultana | 2019-09-29 | `zeeo95` | Saved: Greek Theatre – Los Angeles; source: Tash Sultana at William Randolph Hearst Greek Theatre, Berkeley, CA, USA |
| The California Honeydrops | 2020-09-12 | `jbyw3y` | Saved: Solano County Fairgrounds; source: The California Honeydrops at Sweetwater Music Hall, Mill Valley, CA, USA |
| The Teskey Brothers | 2019-09-29 | `zeeo95` | Saved: Greek Theatre – Los Angeles; source: Tash Sultana at William Randolph Hearst Greek Theatre, Berkeley, CA, USA |
| Victor Wooten | 2018-01-12 | `e171as` | Saved: The Regency Ballroom; source: Victor Wooten Trio at The Regency Ballroom, San Francisco, CA, USA |
| Vulfpeck | 2023-11-12 | `e5bfv9` | Two same-day performances; identify early versus late show |
| ZOLA | 2020-01-23 | `jwehc9` | Saved: Swedish American Hall; source: ZOLA at Café du Nord, San Francisco, CA, USA |

The full earlier coverage report is `setlist-fetch-report.md`: it distinguishes empty pages, no match, future shows and ambiguous sources. A musical program or Spotify list never overwrites an actual performance setlist.

## Database findings

- Saved snapshot: 354 concerts, 320 artists, 93 venues, 15 festivals, one user. No broken references, duplicate event records, default-only user logs, unused artists or unused venues.
- Legacy fields in the snapshot: 352 concert import-provenance maps, two concert-level cancellation markers and 15 duplicate festival date ranges. No `display_name` was present.
- Prepared cleanup removes those fields after archival, moves cancellation markers to owner ticket statuses, and deletes empty user overrides. It stops on unknown fields or conflicting data. The dry-run output has zero retired/unknown fields and zero broken references.
- Lollapalooza festival `jucc7j` still has the old July 28, 2021 range in this snapshot. Its concert `yyea3y` has the user-confirmed July 29–August 1 range. Cleanup explicitly preserves the corrected concert range.
- The resulting six user overrides are four purchased tickets and two cancelled tickets; they are meaningful data, not default-only rows.
- Live cleanup and the six-table cutover remain unfinished. Fresh server reads, a durable current backup and an authenticated admin session are required. Frozen old collections can be removed only after the matching frontend is released and verified. See `table-migration.md`.

### Missing venues (7)

| Date | Event | Venue | ID |
|---|---|---|---|
| 2022-04-08 | Dan Bar-Hava | — | `21kd7n` |
| 2024-05-27 | Primavera Sound Barcelona | — | `3s9mjj` |
| 2022-03-12 | Nancy Zhou | — | `a1ibee` |
| 2022-03-24 | Beau Beau Honeydrops | — | `i2nkgc` |
| 2025-03-08 | Porterfield | — | `iqv7m8` |
| 2023-09-09 | Recital | — | `jit457` |
| 2020-01-17 | Johnson and Johnson | — | `r0pxjn` |

### Date-only events (145)

These keep unknown times unknown. Full IDs are in `database-schema-audit.json`; no midnight guesses were added by this pass.

### Events without performer IDs (31)

Many are festivals, plays, conventions, parties, or a recital. The three musical programs now render by concert ID without introducing fake performers.

| Date | Event | Venue | ID |
|---|---|---|---|
| 2026-08-07 | Outside Lands | Golden Gate Park | `xuwdm1` |
| 2025-09-26 | All Things Go | Forest Hills Stadium | `65mer9` |
| 2025-06-06 | Governors Ball | Flushing Meadows Corona Park | `7zj1wf` |
| 2025-05-20 | Glengarry Glen Ross | Palace Theatre | `how1st` |
| 2024-12-27 | Life and Trust | Conwell Tower | `zocc87` |
| 2024-08-10 | Illinoise | St. James Theatre | `blavfl` |
| 2024-08-01 | Gen Con | Indiana Convention Center | `848240` |
| 2024-07-27 | New York City Tattoo Arts Convention | Terminal 5 | `be1uk3` |
| 2024-06-07 | Governors Ball | Flushing Meadows Corona Park | `cy53a8` |
| 2024-05-27 | Primavera Sound Barcelona | — | `3s9mjj` |
| 2024-05-10 | Kilby Block Party | Utah State Fairpark | `fuaiif` |
| 2024-04-13 | Gimme Gimme Disco | Brooklyn Bowl | `ejctaz` |
| 2024-03-09 | Shakedown Beats | Brooklyn Bowl | `sljutr` |
| 2024-01-20 | The Taylor Party | Webster Hall | `zr5e64` |
| 2023-10-31 | Habbaween | littlefield | `1glyhb` |
| 2023-09-09 | Recital | — | `jit457` |
| 2023-08-03 | Lollapalooza | Grant Park | `ub5qri` |
| 2023-07-29 | Look What You Made Me Do – A Taylor Swift Party | Gramercy Theatre | `hd8krk` |
| 2023-07-21 | Taylor Swift Rave | Webster Hall | `utyehg` |
| 2023-04-15 | The Taylor Party | Webster Hall | `ak38f6` |
| 2021-09-03 | BottleRock Napa Valley | Napa Valley Expo | `c26k26` |
| 2021-07-29 | Lollapalooza | Grant Park | `yyea3y` |
| 2020-05-22 | BottleRock Napa Valley | Napa Valley Expo | `hwtzpg` |
| 2020-02-16 | Gatz | Berkeley Repertory Theatre | `vkv4ky` |
| 2019-09-21 | Sonoma Harvest Music Festival | B.R. Cohn Winery | `81bzyp` |
| 2019-09-11 | Hamilton | Orpheum Theatre | `7csr7y` |
| 2019-08-09 | Outside Lands | Golden Gate Park | `brv1d9` |
| 2019-07-13 | NOS Alive | Passeio Marítimo de Algés | `37a4hj` |
| 2018-11-09 | Reel Rock | Castro Theatre | `ls23su` |
| 2018-09-09 | The Phantom of the Opera | Orpheum Theatre | `nminnq` |
| 2018-08-10 | Outside Lands | Golden Gate Park | `8nhjof` |

## Current versus historical data

Current Khruangbin payloads are compact and typed. The original verbose two-entry sample survives only in immutable `setlist-history` revisions, which are never loaded by the app. Source HTML stays outside the bundle. Withdrawn Spotify identity guesses are not current data; the research manifest retains their historical provenance.

## Local verification

Build and lint passed; Python cache/parser/history tests and TypeScript/emulator migration tests passed. Browser checks confirmed actual setlists plus both artists’ Spotify lists on Khruangbin, the Hamilton program, and Spotify songs on the future Sammy Rae concert. Local fixtures are emulator-only.
