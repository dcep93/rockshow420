# Festivals as concerts

Approved in conversation: festivals are ordinary named concerts with optional headliner, existing supporting_artist_ids lineup, venue and date range. No event hierarchy or separate festival entities. Preserve concert IDs, existing logs and old festival URLs through static aliases.

Six shared documents: venues, artists, concerts, schedules, users, user_concerts. schedules.records is keyed by concert ID; each record contains a sets map keyed by stable short random set ID. Each set has artist_id and optional start/end offset timestamps and stage. A map permits rules to validate selected IDs without a duplicated ID index. Unknown times remain omitted. Repeated performances have distinct set IDs.

user_concerts gains seen_set_ids, default empty. For scheduled concerts the inline concert entry offers set checkboxes (unselected acts dimmed); ordinary unscheduled concerts retain supporting-artist checkboxes. No set selection creates a separate concert or hides the festival itself. Public entries and log rows show selected artists. Returning every override to default removes the user record. Selecting repeated sets remains independent.

Admin schedule editing lives inside /admin/manage, alongside concert editing. Existing concert must be saved before adding a schedule. Validate lineup references, unique set IDs, time offsets and bounds; refuse dropping a selected set or removing an artist still scheduled. Read-only schedule remains public. No modal or object-page admin buttons.

Migration reads and backs up fresh legacy collections. Retire festival wrappers only when each refers to exactly one concert, names agree and dates are preserved; otherwise stop for review. Keep source collections until deployment cutover. Dry run saved production snapshot only; no unauthenticated/live destructive operation.

Spotify saves at most the top five currently published tracks per matched artist, preserving old revisions. Missing or ambiguous artist matches stay explicit; do not fabricate songs or substitute another artist.

Validation: migration invariants, rules ownership and schedule selection constraints, repeated-set independence, default cleanup, build/lint, emulator UI on desktop/mobile. Actual festival-lineup research/import remains a separate follow-up; do not invent lineups for existing festivals.

## Verification and current state

Implemented locally October 8. Build and lint pass; 31 model/migration/rules tests, 2 song-list tests, 14 Python tests and 7 browser scenarios passed (one older async browser assertion was corrected to await its database write). Tested repeated-set selection, reload persistence, default override deletion, admin-only schedules, same-concert selection enforcement, local venue times and mobile layout.

Saved-snapshot dry run: 354 concerts, 320 artists, 93 venues, one profile, six meaningful user overrides, zero schedules. All 15 redundant festival wrappers retire without changing concert IDs. The local emulator preview was restored from this projection, with the profile mapped to its local emulator identity. Production still returns HTTP 429; no production migration or deployment occurred. Festival lineups were not yet imported at this initial verification; see the subsequent import verification below.

Spotify: 287 matched artists saved, 286 with five tracks and one with one. The remaining 33 matching/missing-source cases remain recorded in song-sources-review.md. Old top-ten revisions remain immutable history.

## Festival lineup import and festival days

Approved October 8 with `yesi`: scheduled sets gain optional `day` (YYYY-MM-DD), the programme day independently of an exact timestamp. A July 13 NOS Alive set may start after midnight on July 14 without importing any July 11–12 artists or changing the concert date. The field also retains a known day when the time is unknown. Validate day inside concert bounds; when supplied, start must be that local calendar day or its immediate successor. Without day, existing start bounds remain strict. Preserve and sort day through normalization, show day when time absent, and allow admin editing inline in Manage. Dates must be real dates; offsets and venue timezone remain required for exact times.

Import 14 music festival editions from public archives into the existing concert lineup and schedules document. Preserve concert IDs and user overrides; all sets start unselected. Use short random set IDs saved in a versioned source manifest, reuse artists using explicit identity aliases, retain repeated performances as independent sets. Keep source/provenance and uncertainty outside database records. BottleRock 2020 is the announced lineup of a cancelled edition; do not invent times. Gen Con remains a convention entry, outside this music-lineup import. Primavera includes city shows, with Parc del Fòrum as its primary venue and other performance locations in stage labels. Record any source gaps explicitly.

Back up the local emulator before import, apply with document update-time preconditions, validate every reference/day/time/size and unchanged personal data. Save a reusable local import script and manifest, then build/lint/test and inspect a real festival in the local browser. No production writes, deploy, commit or push.

## Festival import verification

The approved day field and local import are complete: 14 festivals, 1,384 sets, 610 sourced start times. All sets start unselected; personal records remain unchanged. Build, lint and all 37 relevant tests pass; NOS Alive and Lollapalooza were checked in the browser. Re-running the importer performs no writes. See [import report](../../festival-lineup-import.md) for coverage, sources and remaining gaps. Production migration and new-artist song enrichment remain pending. No commit, push or deployment.
