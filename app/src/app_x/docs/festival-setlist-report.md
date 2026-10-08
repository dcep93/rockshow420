# Festival setlist capture report — 2026-10-08

The complete directory pass is finished: **1,079 candidate performance URLs captured**, selected from **1,168 public performance links across 13 festival editions**. All matched candidates were visited. BottleRock 2020 was excluded. This is complete coverage of the observed festival directories for the imported artists, not a claim that no additional or differently attributed setlist exists elsewhere.

**616 verified festival setlists, containing 7,019 song entries, were added.** The full cache now contains 881 performances and 11,755 song entries. Every current content hash matches its metadata and immutable history file. No music API was used.

| Result | Artist/concert pairs |
|---|---:|
| Cached | 616 |
| Matching page with no reported songs | 354 |
| Ambiguous; evidence retained, not published | 69 |
| Artist absent from complete festival directory | 209 |
| Canceled BottleRock 2020; excluded | 81 |
| Unvisited or unresolved identity mismatch | 0 |

The inventory contains 1,387 schedule rows and 1,329 artist/concert pairs. Repeated performances do not overwrite each other: the existing artist:concert key remains unchanged, and all repeated schedule artists or multiple matching public pages stay explicit in the ambiguity report. The 69 ambiguous pairs include pages with songs and empty pages; no individual performance was chosen arbitrarily.

## By edition

| Festival | Cached | Empty | Ambiguous | Absent from directory |
|---|---:|---:|---:|---:|
| NOS Alive 2019 | 15 | 7 | 0 | 12 |
| Primavera Sound Barcelona 2024 | 89 | 54 | 25 | 66 |
| All Things Go 2025 | 20 | 4 | 0 | 0 |
| Governors Ball 2025 | 32 | 18 | 2 | 0 |
| Sonoma Harvest Music Festival 2019 | 9 | 0 | 0 | 1 |
| Outside Lands 2018 | 49 | 22 | 2 | 20 |
| Outside Lands 2019 | 37 | 36 | 1 | 17 |
| BottleRock Napa Valley 2021 | 40 | 25 | 4 | 17 |
| Governors Ball 2024 | 42 | 18 | 0 | 8 |
| Kilby Block Party 2024 | 49 | 20 | 0 | 0 |
| Lollapalooza 2023 | 100 | 55 | 14 | 15 |
| Outside Lands 2026 | 51 | 25 | 17 | 35 |
| Lollapalooza 2021 | 83 | 70 | 4 | 18 |

## Evidence and limits

`festival-setlist-progress.json` includes each pair's programme days, schedule set IDs, candidate URLs, and outcomes. The dated work directory preserves the original public DOM captures, complete-directory count audit, corrected input catalog, and 601 identity-checked performance-time records. Setlist page song order, sections, encores, tape flags, notes, and guest/cover annotations use the existing compact parser.

The initial Megan Thee Stallion capture contained the previous page's MAX identity. Matching rejected it before publication; a canonical-URL-checked recapture resolved it. Large browser strings were found to truncate at 200,000 characters; directory count validation caught incomplete copies, and compact DOM excerpts recovered every visible performance link. All later performance captures check the canonical setlist ID before saving.

A source-directory discrepancy remains in the imported Sonoma 2019 lineup: Nightly has no listing, while Hot Flash Heat Wave appears on September 22. This report does not change the lineup on the strength of setlist.fm alone. Kilby's additional Ginger Root listing falls outside the final imported lineup and was not silently added.

Validation: 11 Python setlist tests passed, covering source mismatch rejection, complete directory capture, overnight date matching, repeated schedule identity preservation, compact parsing, cache hashes, and immutable history. The new research tooling and exact reviewed name variants are described in `festival-setlist-research.md`.
