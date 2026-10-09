# Outside Lands 2021 import

## Design

Add one normal concert for October 29–31, 2021, using the existing Golden Gate Park venue and America/Los_Angeles timezone. Reuse existing artists; create short random IDs only for missing artists, the concert, and sets. Save musical performances from the main stages, SOMA, House by Heineken, and the smaller stages in one schedule. Leave all sets unseen; no personal override is needed to include the festival in the user's log.

Extend the existing reviewed catalog patch format with concert additions, each optionally containing a schedule. Project all unapplied immutable revisions before one atomic commit through the existing GitHub workflow. Preserve backup, update-time preconditions, clean-schema validation, document size limits, revision receipts, and readback verification. Do not change UI, rules, permissions, user records, or music caches.

Using the existing import pipeline gives a reproducible backup and receipt. A direct browser write would not preserve the reviewed import, while a separate workflow would duplicate deployment infrastructure.

Tests cover creation, collision rejection, invalid references, replay, and preservation of personal data. Validate the actual manifest against a production snapshot before deploying, then read back the saved festival and inspect its page.

## Evidence and scope

The promoter lists a noon October 29 start: https://apeconcerts.com/events/outside-lands-211029/

Official schedule posters are preserved at https://www.thatfestivalsite.com/festival/Outside%20Lands?location=Golden+Gate+Park%2C+San+Francisco+CA&year=2021 . Use the dates printed on the posters; the archive page's date heading is one day early. The posters supersede the older four-stage Humble timetable.

Late changes: Reggie Watts replaced Marc Rebillet; Aminé replaced Young Thug; Marc E. Bassy moved into ODIE's Saturday slot, with Petey on Sunday. Green Velvet replaced Scarypoolparty on Panhandle, in addition to his SOMA performance. The replacement Panhandle time and Aminé's ending time remain unset where not independently confirmed.

The import includes music and DJ sets. Cooking demonstrations, comedy, roaming magic, and cooking collaborations are not represented as separate musical performances. Source URLs and research notes stay in the reviewed manifest, outside the live schema.

## Reviewed result

- Concert `f3ysgl`: 111 artists, 122 performances across eight stages.
- 70 new artists; 41 existing identities reused.
- All 122 sets have a programme day and stage; 121 have a published start, 120 have a published end.
- Aminé's end and Green Velvet's Panhandle start/end are omitted. Green Velvet's separate SOMA set is fully timed.
- Production-snapshot projection preserved all 354 existing concerts, 14 schedules, 94 venues, and all user records/37 personal overrides.
- Largest projected table: schedules, 179,708 JSON bytes, below the existing 900,000-byte guard.
- Validation: 38 TypeScript tests, 21 music-cache tests, lint, TypeScript compilation, production build, and actual-manifest projection passed.

No new Spotify or setlist cache fetch is included in this catalog import. Existing cached music remains available for reused artists.
