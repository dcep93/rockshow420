# rockshow420 — approved design

Approved with `yesi` on 2026-10-07. Firebase project: rockshow420. Sole administrator: dcep93@gmail.com.

## Experience

This is a minimal personal concert logger. `/` is Google sign-in and redirects an authenticated Gmail user to `/user/<gmail-local-part>`. Public user pages are the only primary concert lists. There is no global browse page, no past/upcoming filter, and no rendered "Concert log" heading. Show a compact username heading with the concert count and hidden checkbox. At desktop widths, Upcoming is the left column (nearest first), and Past is the right column (most recent first). Mobile stacks these sections in one column. Every concert appears by default, including concerts created after the user joins. No Add concert step is required. Concerts remain until explicitly removed. Other people's notes are shown only on concert detail pages. Beside the visible concert count, an unchecked “Show Y hidden” checkbox switches the log to hidden concerts only, in their chronological sections. Unchecking it returns to visible concerts only. Hidden rows are dimmed and labeled “Hidden”; their concert links remain usable. There are no log-page edit or restore buttons. Admins create catalog entries through Manage.

Public details live at `/venue/:id/:name`, `/artist/:id/:name`, `/festival/:id/:name`, `/concert/:id/:name`. Names are cosmetic slugs: ID lookup survives renaming. Concert names derive from their headliner and venue. Detail pages link their related entities; there is no separate catalog browsing route. Admin catalog management is launched from user options. Catalog editors open inline within Manage; public detail pages have no admin edit buttons.

Responsive layout uses the canonical source `../multisport420/app/src/app_x/styles/multisport.css`: brown-black background, warm translucent panels and tan borders, white body text, pink Comic Sans titles. Preserve semantic links, visible focus, labeled fields, keyboard-operable dialogs, touch targets, and narrow-screen wrapping. Source remains authoritative; no external repo dependency is required to deploy.

## Data contract

Use six Firestore documents at `tables/{venues,artists,concerts,festivals,users,user_concerts}`. Each contains `schema_version: 1` and a `records` map keyed by existing record IDs (not redundant editable id fields). The private admin registry remains separate. Required means necessary for creation; readers tolerate missing optional fields in older records and visibly handle missing references.

- venues: name and timezone (IANA) required; location and image URL optional.
- artists: name required; image URL optional.
- concerts: date (Firestore Timestamp), venue_id and artist_id required; supporting_artist_ids defaults to []; setlist_fm_url optional HTTPS setlist.fm link.
- festivals: name required; concert_ids defaults to [].
- user_concerts: user_id, concert_id required; document ID is `<uid>_<concertId>`; supporting_artist_ids defaults to []; notes defaults to empty; removed defaults to false; ticket_status is an enum: empty string (default), purchased, sold_out, or cancelled. Omitted ticket_status reads as empty. Missing user_concerts records mean included with empty annotations. Removal writes removed: true and preserves notes, selections, ticket status, and unknown fields. Restoration clears removed. Saving a default entry (empty notes, no selected supporting artists, empty ticket status, not removed) deletes the override, or makes no write when none exists. Unknown future fields preserve the record. Public concert pages list each registered user unless they have removed that concert. Selected supporting artists are those seen or planned, from the concert lineup. Ownership and concert identity cannot be reassigned.
- users: document ID is verified Gmail local-part; user_id required; username is the verified Gmail local-part. There is no display name or profile editor. Existing legacy name fields are ignored. No auth email/token is stored in this public collection.
- admins: console-managed document ID is Firebase UID; enabled: true, email: dcep93@gmail.com. No client can write this collection. Admin authorization additionally requires the matching verified Gmail Google account.

All application data is publicly readable, including personal notes. Admin registry reads are allowed to its authenticated owner only. Authentication credentials stay in Firebase Auth. Anonymous writes are denied. Only verified Google Gmail accounts can write. Owners can create/update/delete their profile and their user_concerts; admins can edit all application records. Identity checks live in database rules, not only React.

Venue-local datetime entry converts to an exact UTC instant with an explicit venue zone. Display uses that zone, never the browser's zone. Nonexistent DST times are rejected; repeated times require an explicit earlier/later selection. Changing venue timezone does not silently change existing event instants. Unknown/missing times are displayed safely, not as the current date.

## Evolution and integrity

Keep types, normalizers, time conversion, and writes centralized. Optional data has defaults. Updates patch only known edited fields, preserving unknown future fields. Rule validation protects identity, types, and essential fields without allowlisting every document key. Optional-field defaults are used in rules. Client forms validate referenced entities and URLs. Referenced catalog entities cannot be deleted through the app until their references are removed; removing a concert from one log never deletes the concert. Renaming entities preserves IDs and links.

## Implementation and setup

React/TypeScript/Vite frontend, Firebase Auth/Firestore client, Luxon for IANA time conversion. One provider exposes normalized catalog and public log data, auth readiness, loading/error states, and console-managed admin status. Writes are separate helpers. Firebase's public web config is available from Hosting's `/__/firebase/init.json`; it contains no server key. Development can connect to local Auth and Firestore emulators only when explicitly enabled in development.

App code, rules, tests and setup docs live under app/src/app_x. Necessary dependency/lockfile and deployment changes are part of this approved app implementation. Keep existing automatic Hosting deployment. Database rules and Hosting are deployed by the GitHub workflow on pushes to main; do not silently create a production database, seed production fixtures, or claim Google authentication was tested without a real sign-in.

Local GCP credentials are not present. Provide setup instructions for creating the default Firestore database, enabling Google sign-in, setting authorized domains, deploying rules, and creating the sole admin registry entry after first sign-in. Use a demo project for all automated emulator fixtures.

## Verification

Test anonymous reads/writes, verified Gmail versus unverified/non-Gmail/non-Google identities, owner and cross-owner create/update/delete, immutable ownership, admin catalog and other-user writes, blocked role escalation, optional fields and unknown-field preservation. Test dates across IANA zones and DST gaps/repeats, routes with stale slugs, missing records, schema defaults. Run production build and lint. Use emulator fixtures for desktop/mobile browser checks of login, user log, add/edit/remove, entity routes and public notes. Preserve explicit production setup limitations in final handoff.

## Minimal interface

Keep visible text functional. No slogans, marketing copy, decorative music notes, footer branding, or Find user navigation. The login page has only the app title and Google sign-in button. Do not render account eligibility instructions; show validation errors only when needed. Public user pages remain accessible by their URLs. Empty logs say “No concerts”; the hidden-concert checkbox stays beside the visible count, including when either count is zero. Preserve the shared pink Comic Sans styling.

The minimalism audit also removes decorative image initials, redundant link arrows and plus icons beside text labels, oversized empty states, all-caps eyebrow styling, conversational placeholders, and helper text that repeats available controls. Actual supplied images and user-written notes remain data. Use short factual labels (“User logs”, “No entries”). Label the notes field “Public Notes”, without separate helper copy. Keep only guidance needed to make a decision: venue timezones, ambiguous dates, validation errors, and concise deletion confirmation.

Auth and catalog loading render blank space, without status copy or spinners. The header waits for the initial verified identity and admin result, then renders account controls together. Token refreshes preserve that confirmed session; only an actual account change clears it. The upper-right username opens a small user-options dropdown. It contains Export to clipboard and Sign out for every signed-in user, and admin: Manage for admins. Each option occupies one unwrapped row. These actions stay out of the header until opened. Click outside, Escape, focus leaving the dropdown, or navigation closes it. The brand remains the home link.

## Automatic log implementation (2026-10-07)

Render each user log as catalog concerts minus that user's explicit removals, joining optional personal annotations. Keep unavailable saved concert references visible until removed. Editor operations create overrides lazily; no per-user fan-out or data migration is needed. Preserve existing entries and reject stale saves that would undo a concurrent removal. Admin edits must use the displayed user's UID even when no override exists. Verify default inclusion for old/new users and newly created concerts, removal across reload, restoration with notes preserved, public details, owner isolation, and legacy documents without removed.

## Inline concert editing and hidden rows

Personal fields are always editable inline in the signed-in user's entry on a concert page. Public Notes, supporting-artist selections, Save changes, and Hide/Unhide share one form. Hide/Unhide saves pending edits atomically and never opens a modal. Public detail pages have no admin controls for editing other users' entries. Hidden entries remain accessible to their owner/admin on the concert page so they can be unhidden. Default cleanup continues to apply when unhiding without personal changes. The checkbox affects display only and starts unchecked when opening a user page; it never writes user data.

Manage opens at `/admin/manage` as a page, with the existing record tabs, search and New action. The route waits for resolved authentication and is restricted to admins. Record editors appear inline on Manage. Closing a record editor returns to the selected management tab and search.
# Notion import

The reverse chronological Notion list uses trailing year labels. Preserve every dated entry; expand ordinary multi-night ranges to one concert per date. A festival range has one named concert entry and one festival referencing it, preserving the date span without inventing individual performances. Named theater and other events can omit a headliner. Unknown venues remain empty.

Concerts optionally have `name`, `date_precision` (`day` or `time`), and `end_date` (calendar date). A day-only `date` uses midnight UTC as a storage anchor and must be rendered without timezone conversion or a time. Timed concerts continue using UTC timestamps and venue timezones. Optional fields and source metadata survive partial edits.

The one-off Notion import ran through the signed-in admin session; its temporary control was removed after verification. Its immutable manifest has stable source-row/date IDs and preserves the two existing concerts. The importer created missing records in dependency order using transactions, without overwriting existing records or writing profiles or user_concerts. A repeated run created zero records. Import source text and year are preserved on each event. Permissions remain public reads and existing admin-only catalog writes. Build/lint, date-only tests, and a complete emulator import validate the change before live import. No commit or push until requested.

Ticket status is edited inline on the concert page with a blank/Purchased/Sold out/Cancelled dropdown and shown on public entries when nonempty. Firestore rules enforce the enum for owners and admins. Clearing it removes a default-only override; other annotations and unknown future fields preserve the record.

## Clipboard export

User options contains Export to clipboard for every signed-in user. It always exports the signed-in user's non-hidden log, regardless of the currently viewed page or Show hidden checkbox. The button waits for a complete catalog, reports Copied only after the clipboard write succeeds, and allows retry on failure. It uses the browser clipboard from the click gesture, with no server writes or additional requests.

The pure formatter reads current normalized catalog data and personal overrides, never import source text, source row IDs, hard-coded name aliases, or today's date. Each plain-text line is `[ticket prefix][event name or headliner + selected supporting artists] M/D[-D or M/D] [venue]`. Prefixes are `$` for purchased, `%` for sold_out, and `!` for cancelled; empty has no prefix. Explicit event names take precedence. Unselected supporting artists, notes, times, and setlist links are omitted. Dates use venue timezones for timed events and stored calendar days for date-only events. Matching title identity, venue, selected supporting lineup and ticket status combine consecutive dates within a year. Hidden dates break a run. Ranges crossing years print both years explicitly. Rows sort newest starting calendar day first with deterministic tie breaks; each year's label follows its entries, with two blank lines between year groups. Empty logs export an empty string; incomplete references or invalid dates fail visibly instead of silently dropping entries. This reproduces the source list's structure, not its inconsistent spelling, casing, abbreviations, or arbitrary spacing.

The source's purchased markers were applied to the user's November 5 Sammy Rae entry and all three October 29–31 Lawrence entries. No sold-out markers were present in the imported source. No commit or push.

Concert columns update every minute and when the window regains focus. Timed shows move to Past at their start instant. Date-only events and date ranges remain Upcoming through the final day in the venue timezone (UTC if unavailable), including DST boundaries. Unavailable or undated records remain visible below the columns. Clipboard export retains its separate reverse chronological format.

Escape returns to the signed-in user's log, or `/` when signed out. It works from detail pages, Manage, focused form fields, and the account dropdown. It does not save an open draft. Already being home adds no history entry; repeated key events and active IME composition are ignored.

## Short record IDs

Concerts and festivals use six-character random lowercase alphanumeric IDs, generated with Web Crypto and checked for collisions in the create transaction. Collision retries allocate a new ID rather than overwriting any existing record. Editing preserves the existing ID. Artist and venue IDs are unchanged; user-entry IDs remain `<uid>_<concertId>` for ownership rules.

All 354 concerts and 15 festivals were migrated on 2026-10-08 UTC. All 15 festival references and four user overrides moved with them. Before/after Firestore REST snapshots and the mapping are saved outside the source repository in `~/repos/_codex_output/rockshow420/id-migration-2026-10-08/`. An independent comparison verified every document field, allowing only the intended ID/reference substitutions; collection counts and unrelated records are unchanged. A fresh-server repeat verified zero remaining renames. `legacyIds.json` resolves old concert/festival links and replaces their URL without adding history. The historical Notion manifest retains original import IDs as an audit record and is not a runtime data source. The temporary admin migration control was removed after completion. Compatibility redirects and new-ID creation remain local until deployed.


# Portable title fonts and cancelled tickets

Keep native Comic Sans first in `--app-title-font`, with bundled OFL Comic Relief as the fallback. The shared bootstrap assets live in `dcep93.github.io/mac/newapp-assets`; `newapp.sh` copies them and imports their CSS. Vite embeds the font in the CSS so phones do not depend on a third-party font server or a late network request. The canonical theme still comes from multisport420.

Cancellation is a `user_concerts.ticket_status` value, displayed as Cancelled and exported with `!`. The one-off import cleanup moves legacy `concerts.status == cancelled` markers into the importing user's ticket status transactionally, preserving other fields and removing the redundant event marker.

The two imported markers (BottleRock 2020 and Disturbed 2020) were moved to dcep93's ticket statuses on 2026-10-08 UTC. Live rules accept the new value. Before/after snapshots under `~/repos/_codex_output/rockshow420/cancelled-migration-2026-10-08/` verified that only the intended marker fields changed. The temporary migration control was removed.
