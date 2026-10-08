# Performance song lists

Approved in conversation: keep artist:concert keys, support multiple performances,
render compact song lists within lineup/schedule rows, and resolve the researched
festival omissions. User authorized implementation with “seems good. lets continue”.

## Cache

Every setlist cache value becomes an array of compact performances. Each keeps
`kind: setlist_fm`, source URL, song sections and annotations. Festival entries
add `set_id`, referencing the existing schedule. Ordinary concerts omit it.
No new database table. Version the schema migration and preserve immutable old
revisions. Refresh upserts a performance by set ID (or its ordinary source URL)
without removing other sets, rejects duplicates/conflicting identities, and
publishes only after all input parses successfully.

Match held festival pages to individual schedule rows using artist, festival
membership and documented dates. Require unique matches in both directions;
overlapping same-day/overnight candidates stay held. Never copy one setlist to
several performances. Preserve existing schedule IDs and personal selections.

## UI

Use compact expandable numbered songs, retaining set/encore headings, annotations,
tape flags and source links. Spotify is a distinct collapsed Top N disclosure;
musical programs retain their production basis. Ordinary song lists sit directly
under each artist; festival lists sit inside schedule rows grouped by programme
day. Avoid repeating the entire lineup below the schedule, raw JSON, loading text,
new decorative copy, modals or admin buttons. Keep canonical pink/Comic Relief
styling and responsive layout. Existing personal selection editing stays intact.

## Data corrections and research

Add Ginger Root to Kilby May 12, 2024, Desert Stage, scheduled 19:30 MDT. Include
its public setlist when verified. Add Sonoma's supported Hot Flash Heat Wave set
for September 22 without inventing a time or silently deleting Nightly while its
replacement status remains unresolved. Continue a source-backed pass on the 136
ordinary date-only events and 33 ordinary artist Spotify gaps. Record unresolved
identity/multiple-show ambiguities; absence of a match is not proof of absence.

Production updates run through GitHub, with an uploaded fresh backup before
conditional atomic writes. Only reviewed fields change; personal records and
unrelated changes remain intact. Corrections are idempotent and fail on conflicting
edited values. Verify resulting public records and deployed assets.

## Verification

Test schema migration, immutable revisions, independent repeated-set refresh,
rejected ambiguous matching, correct UI selection by set ID, render semantics,
and conditional/idempotent data corrections. Run affected TS/Python tests,
lint/build, inspect ordinary and festival pages in browser, then commit/push and
verify the GitHub deployment. Report additions and remaining gaps honestly.
