# Owner concert controls

Approved with `yesi` on 2026-10-09.

The main concert layout always displays the existing dcep93 profile's user_concert override. Resolve its UID from catalog.profiles, never from whichever account is signed in. Missing overrides use the current empty defaults without creating records. Only that UID may edit these controls. Everyone else sees identical disabled ticket, Hide/Unhide and supporting/festival checkboxes, plus read-only selectable Public Notes and a disabled Save button. Source links and disclosures stay interactive. No new visible labels or layout changes for dcep93.

User logs exclude dcep93 and profiles without an actual override. Other entries remain compact and read-only, preserving the existing hidden-entry policy. The signed-in user's own hidden entry remains visible so they can unhide it. Their existing entry offers compact inline controls for status, visibility and artists/sets, plus notes. Controls save immediately; notes require Save. No duplicate images, songs or full lineup. Retain a mounted own editor after a successful reset deletes its default-only record; discard that transient eligibility on navigation/account change. Do not create blank entries for users who have never saved a log.

Keep data ownership separate from edit permission. Read-only mutations are guarded in the editor hook as well as disabled in the UI. Errors retain current handling; no data is copied between accounts. The current account/concert key resets drafts on account or event changes. Reuse existing subscriptions, schema, Firebase rules and sparse-record cleanup. No extra reads, migrations, login/feed routing changes or future per-user catalog ownership.

Verify guest/owner/other account control values and disabled states, missing owner/profile/log, real-entry filtering, own hidden entries, festivals, immediate saves, explicit notes save, reset cleanup, and account switches. Use synthetic fixtures for account scenarios; do not modify production personal logs for testing.
