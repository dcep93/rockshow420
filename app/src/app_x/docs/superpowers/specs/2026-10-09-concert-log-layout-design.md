# Concert log layout

Ticket status and Hide/Unhide sit above the lineup heading. Supporting-artist checkboxes live next to the actual artist rows; festival seen-set checkboxes live next to scheduled performances. Headliners are not optional. Logged-out visitors see no personal controls.

The right-hand main panel is Public Notes, with textarea and Save only. Other users appear underneath as compact rows: linked username, optional status, selected acts or dated sets, and notes. Preserve existing visibility rules and show no empty section when no other users exist. On mobile the columns stack. Keep the existing theme and accessible checkbox labels and touch targets.

Extract the current editor state into a shared hook mounted once per concert/viewer. Preserve optimistic updates, write serialization, subscription acknowledgement, failure rollback, unsaved note drafts, partial patches, and default-record cleanup. No database schema changes.

Verify lint/build, model tests, ordinary and festival controls using local emulators, desktop/mobile layout, and authenticated versus guest rendering. Release via the existing GitHub workflow.
