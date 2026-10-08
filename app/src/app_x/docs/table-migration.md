# Six-table migration

The active tables are `venues`, `artists`, `concerts`, `schedules`, `users`, and `user_concerts`. Festivals are named concerts; `schedules` replaces the retired festival table. The frontend reads six document snapshots through `data/tables.ts`. Each map keeps existing IDs and native Firestore values. The one-off migration now removes known retired fields only after saving the raw source backup and checking references and date ranges. Normal edits transactionally patch one map entry and set `changed_id`; security rules verify that no other entry changed. Owners retain access only to their profile and log entries. The private `admins/{uid}` registry is separate from the six public data documents.

This reduces initial catalog delivery to six document reads. Authentication/profile checks, security-rule dependent reads, transaction reads, reconnects, and subsequent table changes remain additional reads. Each changed table is delivered in full. Each table must fit Firestore's 1 MiB document limit; migration rejects tables above a conservative 900 KB JSON estimate. Nested record indexing is disabled by `backend/firestore.indexes.json`.

## Live cutover

Production has not been migrated. Firestore returned `429 RESOURCE_EXHAUSTED` on October 8, 2026 UTC. Saved import/research snapshots are not an authoritative current database backup and must not be used for production migration.

1. Once fresh server reads work, deploy `backend/firestore.rules` and `backend/firestore.indexes.json` using the backend Firebase config. Keep the old hosting release until migration succeeds. Do not push/deploy hosting without the user's requested release instruction.
2. In a controlled authenticated admin session, invoke `migrateTables(db, saveBackup, options)` from `data/migrateTables.ts`. Supply a callback that durably saves all raw values, preserving Timestamp seconds/nanoseconds and other Firestore types, and rejects if saving fails. The function is deliberately not exposed as an ordinary application control. A temporary migration runner can import it without changing the permanent UI.
3. The function first probes server reads, creates a schema-0 `tables/concerts` lock, and then reads all six legacy collections from the server. New rules reject every legacy write while that lock exists, including owner deletes. It saves the backup before preparing a clean schema with `cleanSchema` and atomically publishing all six schema-1 documents. It never deletes legacy collections during this phase. Unknown fields halt migration for review rather than being silently dropped.
4. Read all six new documents from the server and compare record IDs, counts, references, and all retained fields against the cleaned projection of the saved backup. Verify each removed field in the archived raw source. Check the new frontend against production locally, including public reads and an owner edit/reset. Then publish the matching frontend when release is authorized.
5. Old clients can still read legacy data but cannot write after cutover. After the matching frontend is live and the six tables are verified, finish the requested cleanup by deleting the frozen legacy collections from the database using the durable external backup. Until that cutover, they must remain available to the hosted old client. Remove their temporary compatibility rules in the same release. Do not describe production as clean before this final step; no automatic deletion or reverse migration is provided.

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

## Schema cleanup (prepared, not run against production)

`cleanSchema` is pure and leaves the supplied backup untouched. It removes `users.display_name`, archives `concerts.import_source` in the caller's durable backup, moves legacy concert cancellations to the sole owner's `ticket_status`, removes default-only log entries, and retires festival wrappers only when each references one concert with the same name and preserved date range. It refuses ambiguous multi-concert festivals. Old festival URLs resolve through static aliases; they do not require a legacy table. It rejects unknown fields, broken references, noncanonical log IDs, unsupported ticket statuses, and ambiguous cancellation ownership. Normal application edits remain forward-compatible with newly added fields; the cleanup is an explicit one-off operation.

The saved snapshot contains one known date conflict: festival `jucc7j` still says July 28, 2021 while its concert `yyea3y` has the user's confirmed July 29–August 1 correction. After checking fresh records, supply:

```ts
const options = { confirmedFestivalDates: { jucc7j: { start: "2021-07-29", end: "2021-08-01" } } };
```

The option only accepts that exact range in the current concert data. It does not change concert dates. If fresh reads instead show that tables were already migrated, use a privileged one-off transaction with a fresh durable backup and this pure transformation. The normal client rules intentionally allow only one entry change per table; do not broaden them for a cleanup utility.

`database-schema-audit.json` describes the saved pre-cleanup snapshot; `database-cleanup-dry-run.json` describes the transformed snapshot. Neither is evidence of current production contents. The dry run has no retired/unknown fields, broken references, duplicate event records, or default-only logs. It retains all 354 concerts, 320 artists, 93 venues and one user. The 15 duplicate festival wrappers are removed; `schedules` starts empty; four purchased overrides plus two migrated cancellations remain meaningful user data. Festival lineups and schedules have not yet been researched/imported.

## Schedule representation

`tables/schedules.records[concertId] = { sets: { [setId]: { artist_id, start?, end?, stage? } } }`. Stable six-character set IDs distinguish repeat performances. Times are ISO strings with explicit offsets, interpreted in the concert venue timezone; unknown times stay absent. `user_concerts.seen_set_ids` defaults to `[]`, and records with no remaining override are deleted. Adding a schedule to an event with preexisting supporting-artist selections stops for explicit reconciliation; it never silently marks a particular performance seen. Removing or reassigning a selected set also stops for review.

Schedules are public, edits require an admin, and rules restrict user selections to set IDs on that same concert. Admin application validation also checks artist membership, time ranges and retained selections. Legacy collection rules remain only for the pending cutover described above.

## GitHub release pipeline (prepared October 8)

The user requested GitHub deployment. The workflow now builds/tests, authenticates using the existing SA_KEY secret, prepares a fresh six-table projection, and uploads a raw backup of the publicly readable legacy collections. The restricted, unchanged admins registry is checked in memory and is never placed in an artifact. No service-account credential is placed in an artifact.

On initial migration it deploys migration-compatible rules and index exemptions, waits eleven minutes for active clients to adopt the rules, then locks writes and re-reads. Any source change since artifact upload aborts safely and removes only its own lock. Matching sources publish all six tables atomically with native timestamp precision preserved. The latest preflight contains 35 meaningful personal overrides, all preserved.

The workflow deploys Hosting, verifies exact index HTML and hashes of every built asset plus six public table reads/schema integrity, then conditionally retires the backed-up legacy documents and deploys final rules with no legacy access. It uses the service account through ADC; interactive CLI sign-in is unnecessary. Artifacts are retained for 90 days and should also be downloaded to the operator's durable backup storage after the run.

A repeated release validates existing tables without replacing them. It backs up any remaining frozen legacy documents and can resume cleanup. Migration-compatible rules are only deployed on an initial migration; final rules remain authoritative thereafter. A failed run is not evidence that production migration or cleanup finished. Check step results and saved reports.
