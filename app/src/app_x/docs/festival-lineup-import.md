# Festival lineup import — October 8, 2026

Imported into the local `demo-rockshow420` emulator and committed/pushed for GitHub deployment. The first release passed build/tests but stopped before production changes because the deployment account lacked Firestore IAM permissions. Production migration remains pending.

14 existing festival concerts now have 1,387 scheduled sets. All attendance starts unselected. Added 1,067 artist records and Parc del Fòrum; preserved all 354 concert IDs, one profile and six personal overrides. User data was compared before/after and was unchanged.

1,180 sets have sourced start times; 207 have no verified exact time (82 are the cancelled BottleRock 2020 lineup). Every set has a sourced programme day. Unknown values remain omitted.

| Festival | Sets | Known start times |
|---|---:|---:|
| lollapalooza-2023 | 195 | 187 |
| lollapalooza-2021 | 176 | 174 |
| governors-ball-2025 | 52 | 52 |
| governors-ball-2024 | 68 | 62 |
| bottlerock-2021 | 86 | 1 |
| all-things-go-nyc-2025 | 24 | 24 |
| kilby-block-party-2024 | 69 | 67 |
| Outside Lands 2018 | 93 | 93 |
| Outside Lands 2019 | 92 | 92 |
| Outside Lands 2026 | 147 | 135 |
| NOS Alive 2019 — July 13 | 34 | 34 |
| Sonoma Harvest 2019 — September 21–22 | 10 | 10 |
| BottleRock 2020 — cancelled | 82 | 0 |
| Primavera Sound Barcelona 2024 | 259 | 249 |

## Sources and remaining gaps

The versioned [manifest](../imports/festival-lineups-2026-10-08.json) contains each festival's sources, research notes, intended concert fields and stable set IDs. It is the repeatable import input; provenance stays outside runtime database records.

- NOS Alive contains July 13 only. Its 34 sets retain July 13 as `day`, while after-midnight timestamps correctly fall on July 14 in Europe/Lisbon. Sonoma contains September 21–22 only.
- BottleRock 2020 is the announced lineup for a cancelled edition. It has no actual performance times; existing cancelled ticket status is preserved.
- Governors Ball 2025 omits confirmed cancelled acts. Saturday now uses the published weather-adjusted timetable.
- Outside Lands 2026 includes available main-stage, Dolores and Cocktail Magic programming. An unnamed surprise guest is omitted. Repeated Bingo Loco slots could not be resolved individually, so each day's programme entry is retained once. The 147 imported slots are not a claim of complete slot-level coverage.
- Primavera includes the main festival, opening day, city shows and Brunch. City-show locations appear as stage labels. Arca's malformed source time remains omitted; cancelled performances and a listening party are excluded.
- Lollapalooza's 21 originally undated entries were resolved: 19 gained days, Lauren Sanderson was removed as cancelled, and Emotional Therapy was removed as a listening/Q&A session. Seven additional dated Kidzapalooza appearances were added. Archived stage sponsor names may not match the historical sponsor exactly. BottleRock 2021 includes archive-only DJ extras without verified times. These are source-quality caveats, not verified exact schedules.
- Gen Con remains an unchanged convention entry. Its convention programme was not imported as musical artists.
- Joint billed performances stay joint; verified repeated performances receive separate set IDs. A targeted independent source audit corrected five names/replacements; it was not an independent re-verification of every performance.
- Music enrichment is complete for the accessible matching sources: 1,187 artists have Spotify lists (200 unresolved/unavailable), and 616 festival setlists were added (881 total). See [Spotify report](spotify-festival-enrichment.md) and [festival setlist report](festival-setlist-report.md) for exact coverage, empty pages and ambiguous repeated performances.

## Re-running locally

From `rockshow420/app`:

```sh
npx tsx src/app_x/imports/importFestivalLineups.ts
npx tsx src/app_x/imports/importFestivalLineups.ts --apply
```

The first command is a dry run. The importer is hardwired to localhost port 8080 and has no production option. It validates references, days/times and table sizes, refuses conflicting schedules, backs up fresh documents, and submits conditional field updates atomically. It never writes `users` or `user_concerts`. Re-running after import returned `Already imported; no writes.`

Pre-import backup:
`/Users/danielcepeda/repos/_codex_output/rockshow420/festival-import-2026-10-08/before-apply-1791442793386.json`

## Verification

Build and lint passed. All 37 model, schedule, cleanup and isolated-emulator table/rules tests passed. The rules tests used `demo-rockshow420-tables`, preserving the imported preview database. Spec and code-quality reviews passed. Browser checks confirmed NOS Alive's after-midnight timestamps and Lollapalooza's day-only schedule. Import validation and readback confirmed exact record counts and unchanged personal data.

After import: 1,387 artists, 94 venues, 354 concerts, 14 schedules, one profile and six personal overrides. The largest table is schedules at approximately 162 KB of JSON.

## Follow-up reconciliation

[Per-set corrections](../imports/festival-schedule-corrections-2026-10-08.json) preserve the evidence for 435 existing-set patches, seven additional appearances, three cancelled/non-performance exclusions and the single Maz & Kidd Revel joint bill. Times are published scheduled starts, not measured performance starts. All remaining unknown times stay absent. Existing personal records were untouched during local corrections. Production migration is now prepared for GitHub Actions; live status must be verified from the run before describing this as deployed.

[Additional start corrections](../imports/festival-start-corrections-2026-10-08.json) add 132 starts from exact artist/day/venue matches in public setlist.fm captures. These are community-reported **scheduled** starts, never doors, tour averages, or measured actual starts. Shared Postal Service/Death Cab billing times and four unclear after-midnight Primavera dates remain omitted. Only schedules changed in the local conditional update; all other tables were compared and unchanged. The production projection still preserves all 35 live personal overrides.

[Kilby final-lineup correction](../imports/festival-kilby-correction-2026-10-08.json) replaces withdrawn Wu-Tang Clan with Santigold using a fresh set ID, and verifies TAGABOW/Petey aliases through their official labels. Three more scheduled starts are preserved. The unused newly imported Wu-Tang artist was removed after reference checks; no personal data changed.

The final comparison against all 601 captured performance-time records found no further safe starts. Of 207 untimed rows, 82 belong to cancelled BottleRock 2020; seven other rows have explicit time/date ambiguities. The remaining gaps stay absent rather than inheriting another artist’s, another day’s, or an actual-performance time. Two lineup discrepancies (Sonoma Nightly/Hot Flash Heat Wave and an extra Ginger Root page at Kilby) remain documented in the setlist report; source directories alone did not establish catalog changes.
