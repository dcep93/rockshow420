# Immediate personal concert sync

Ticket status, supporting artist selections, seen sets and Hide/Unhide save immediately. Public Notes remain a local draft until their Save button is pressed. Changing any other control must never save or discard that draft.

Use partial-field Firestore transactions, merging each patch against the latest stored record. This prevents a notes save from overwriting newer selections and prevents control autosaves from publishing draft notes. Preserve unknown fields, validation, ownership, hidden-entry protections and default-only record deletion. Explicit Unhide is required to restore a hidden event; omitted removed preserves its current value.

The inline editor optimistically displays a changed control until the subscribed record acknowledges it, serializes writes with disabled controls while pending, and shows errors with rollback for failed control writes. Notes remain editable and retain their draft on failure or while another write completes. Only the notes Save shows Saving. No success banners or extra copy. Scope is the personal concert editor; admin catalog forms retain their separate validation/save workflows.

Verify field isolation and concurrent writes in the Firestore emulator, default cleanup, hidden-state preservation, draft retention and immediate persistence in a browser. Commit and deploy through GitHub.
