# Six table documents

Approved by the user's request to implement the six-document design.

Store application data at tables/{venues,artists,concerts,festivals,users,user_concerts}. Each document has schema_version: 1, records keyed by the existing IDs, and changed_id identifying the one record changed by an ordinary write. Preserve raw fields and Firestore timestamps. The UI continues to consume the same normalized Catalog. No pagination, redesign, schema tightening, or new cache layer.

Six direct document listeners replace six collection listeners. Missing/incomplete table documents are a migration error, never an empty successful catalog. Owner/admin permissions remain unchanged. The private admin registry remains separate. Every ordinary write changes exactly one map entry, with changed_id verified against the actual map diff. User profiles cannot change ownership; users can only change their own log entries. Default-only overrides are removed with a nested field deletion. Unknown fields survive edits.

Migration uses current server reads, not historical backups. Creating a schema_version: 0 concerts table freezes legacy writes through security rules. After reading all six legacy collections and saving a backup, a transaction creates all six complete tables atomically. An interrupted migration can be resumed. A failure before publishing releases only its own freeze. Existing source records remain read-only rollback data; do not delete them. The old hosted client must be published with the new client at cutover or it remains a read-only view of the legacy snapshot.

Quota currently rejects a one-document read. Complete local implementation and emulator tests now; do not activate production from a stale backup or change billing. Cutover must wait for fresh reads. No commit, push, or hosting deploy until requested.

Validation: six listener targets; public reads; Gmail and admin permissions; malicious cross-user and multi-entry writes; reference checks; default removal; concurrent writes; exact timestamps/unknown fields; migration preservation, collision/retry/failure cases; build/lint; browser checks against the emulator.
