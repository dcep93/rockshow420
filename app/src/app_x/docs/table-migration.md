# Six-table migration

The active tables are `venues`, `artists`, `concerts`, `schedules`, `users`, and `user_concerts`. Festivals are named concerts; `schedules` replaces the retired festival table. The frontend reads six document snapshots through `data/tables.ts`. Each map keeps existing IDs and native Firestore values. The one-off migration now removes known retired fields only after saving the raw source backup and checking references and date ranges. Normal edits transactionally patch one map entry and set `changed_id`; security rules verify that no other entry changed. Owners retain access only to their profile and log entries. The private `admins/{uid}` registry is separate from the six public data documents.

This reduces initial catalog delivery to six document reads. Authentication/profile checks, security-rule dependent reads, transaction reads, reconnects, and subsequent table changes remain additional reads. Each changed table is delivered in full. Each table must fit Firestore's 1 MiB document limit; migration rejects tables above a conservative 900 KB JSON estimate. Nested record indexing is disabled by `backend/firestore.indexes.json`.

## Live cutover

Deploy through `.github/workflows/workflow.yaml` on `main`. No personal Firebase CLI login is needed; GitHub uses its existing `SA_KEY` secret. Production migration completed on October 8, 2026 at 08:07 UTC through GitHub run 37745926370, attempt 3, deploying application commit 4e1db093dd2754fe3747387e83fec7e7c5905aed. The owner approved the two missing Firestore IAM roles; after propagation, every pipeline step passed. All 818 legacy documents were conditionally retired after backup and live asset/table verification. The six public tables preserve all 354 concerts and 35 personal overrides; the private admin registry remains unchanged.

1. Prepare a fresh source backup and validated six-table projection. Upload the backup artifact before any write. Saved research snapshots are never substituted for fresh production data.
2. Deploy `backend/firestore.migration.rules` and index exemptions. Wait eleven minutes for active clients to adopt the write protections while the old application remains usable.
3. Create the schema-0 `tables/concerts` lock, re-read the source and require an exact match to the uploaded backup. Any intervening edit aborts safely. Publish all six schema-1 documents atomically with native Firestore timestamp precision preserved.
4. Deploy matching Hosting, verify exact HTML and built asset hashes, and read/validate all six public tables.
5. Delete only unchanged, backed-up legacy documents with update-time preconditions. Verify that all six legacy collections are empty, then deploy final rules with no legacy access. The private admins registry remains separate and unchanged.

GitHub artifacts contain the previously public database records, never the restricted admin registry or credentials. Download successful backup/report artifacts to durable operator storage; GitHub retention is 90 days. Check the run and reports before describing production as migrated or clean.

## Interruption recovery

If backup/copy fails, the function attempts to remove only its own schema-0 lock. If quota/network failures prevent that cleanup, legacy writes remain frozen. Stop the failed runner, inspect `tables/concerts`, and remove the schema-0 lock as admin only after confirming no runner is still active. Rerun from fresh source reads. Never delete a schema-1 table to retry. An existing destination table other than the lock causes migration to stop without overwriting it. A repeat after a successful migration validates all six documents and makes no writes.

Do not roll back by simply deleting the new documents or unfreezing old collections: edits made after cutover exist only in the new tables and would be lost. Any later rollback needs a fresh backup and reconciliation.

## Local checks

From `app`, with the Firestore emulator running:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx --test src/app_x/tests/rules.test.ts src/app_x/tests/tables.test.ts src/app_x/tests/model.test.ts src/app_x/tests/session.test.ts
npm run build
npm run lint
```

`tests/seed.mjs` seeds the six-table layout in the demo project. The emulator preview at port 5173 uses disposable test fixtures; port 5174 remains connected to production. No preview writes are copied to production.

## Schema cleanup

`cleanSchema` is pure and leaves the supplied backup untouched. It removes `users.display_name`, archives `concerts.import_source` in the caller's durable backup, moves legacy concert cancellations to the sole owner's `ticket_status`, removes default-only log entries, and retires festival wrappers only when each references one concert with the same name and preserved date range. It refuses ambiguous multi-concert festivals. Old festival URLs resolve through static aliases; they do not require a legacy table. It rejects unknown fields, broken references, noncanonical log IDs, unsupported ticket statuses, and ambiguous cancellation ownership. Normal application edits remain forward-compatible with newly added fields; the cleanup is an explicit one-off operation.

The saved snapshot contains one known date conflict: festival `jucc7j` still says July 28, 2021 while its concert `yyea3y` has the user's confirmed July 29–August 1 correction. After checking fresh records, supply:

```ts
const options = { confirmedFestivalDates: { jucc7j: { start: "2021-07-29", end: "2021-08-01" } } };
```

The option only accepts that exact range in the current concert data. It does not change concert dates. If fresh reads instead show that tables were already migrated, use a privileged one-off transaction with a fresh durable backup and this pure transformation. The normal client rules intentionally allow only one entry change per table; do not broaden them for a cleanup utility.

`database-schema-audit.json` describes the saved pre-cleanup snapshot; `database-cleanup-dry-run.json` describes the transformed snapshot. Neither is evidence of current production contents. Those original local dry runs predate the festival import. The fresh production preflight has 35 meaningful personal overrides, all preserved by the current projection. The projection retains 354 concerts and one profile, imports the researched festival artists/venue/schedules, and retires 15 duplicate festival wrappers. See `festival-lineup-import.md` for current import counts.

## Schedule representation

`tables/schedules.records[concertId] = { sets: { [setId]: { artist_id, day?, start?, end?, stage? } } }`. Stable six-character set IDs distinguish repeat performances. The optional `day` is the festival programme date, including when an after-midnight performance falls on the next calendar date. Times are ISO strings with explicit offsets, interpreted in the concert venue timezone; unknown times stay absent. `user_concerts.seen_set_ids` defaults to `[]`, and records with no remaining override are deleted. Adding a schedule to an event with preexisting supporting-artist selections stops for explicit reconciliation; it never silently marks a particular performance seen. Removing or reassigning a selected set also stops for review.

Schedules are public, edits require an admin, and rules restrict user selections to set IDs on that same concert. Admin application validation also checks artist membership, time ranges and retained selections. Temporary legacy collection rules live in `firestore.migration.rules`; final `firestore.rules` contains no legacy access.

## Deployment access and recovery

The workflow uses the existing `SA_KEY` service account through ADC. Required roles are Firebase Hosting Admin, Firebase Rules Admin, Service Usage Viewer, Cloud Datastore User, and Cloud Datastore Index Admin. The owner explicitly approved adding the last two roles on October 8. Their effective access was verified by the successful backup/migration run. The pipeline never requests personal CLI authentication or stores credentials in artifacts.

A repeated release validates existing tables without replacing them. It backs up any remaining frozen legacy documents and can resume cleanup. Migration-compatible rules are only deployed on an initial migration; final rules remain authoritative thereafter. A failed run is not evidence that production migration or cleanup finished. Check step results and saved reports.

## Completed release evidence

[GitHub release](https://github.com/dcep93/concertboxd/actions/runs/37745926370): all steps passed. Live counts: 94 venues, 1,387 artists, 354 concerts, 14 schedules, one user and 35 personal overrides. Exact built HTML and five asset hashes matched production; the final access rules deployed successfully. Public browser checks rendered the corrected Kilby schedule and music-cache controls without runtime errors.

Backup and verification reports were also downloaded outside the repository to `/Users/danielcepeda/repos/_codex_output/concertboxd/production-cutover-2026-10-08/github-run-37745926370-attempt-3-reports`. The `cutover-verified.json`, `hosting-verified.json`, and `retirement-verified.json` reports record counts, commit, asset hashes and deletion totals. These are operator artifacts, not app runtime data.
