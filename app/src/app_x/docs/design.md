# rockshow420 — approved design

Approved with `yesi` on 2026-10-07. Firebase project: rockshow420. Sole administrator: dcep93@gmail.com.

## Experience

This is a minimal personal concert logger. `/` is Google sign-in and redirects an authenticated Gmail user to `/user/<gmail-local-part>`. Public user pages are the only primary concert lists. There is no global browse page, no past/upcoming filter, and no rendered "Concert log" heading. Show the username, all their saved concerts ordered by descending event instant, and an Add concert action for the owner or admin. Concerts remain until explicitly removed. Other people's notes are shown only on concert detail pages. A searchable modal selects existing concerts; admins can create missing catalog entries.

Public details live at `/venue/:id/:name`, `/artist/:id/:name`, `/festival/:id/:name`, `/concert/:id/:name`. Names are cosmetic slugs: ID lookup survives renaming. Concert names derive from their headliner and venue. Detail pages link their related entities; there is no separate catalog browsing route. Admin management is an in-page dialog launched by a small admin control.

Responsive layout uses the canonical source `../multisport420/app/src/app_x/styles/multisport.css`: brown-black background, warm translucent panels and tan borders, white body text, pink Comic Sans titles. Preserve semantic links, visible focus, labeled fields, keyboard-operable dialogs, touch targets, and narrow-screen wrapping. Source remains authoritative; no external repo dependency is required to deploy.

## Data contract

Use Firestore collections, with IDs from document paths (not redundant editable id fields). Required means necessary for creation; readers tolerate missing optional fields in older records and visibly handle missing references.

- venues: name and timezone (IANA) required; location and image URL optional.
- artists: name required; image URL optional.
- concerts: date (Firestore Timestamp), venue_id and artist_id required; supporting_artist_ids defaults to []; setlist_fm_url optional HTTPS setlist.fm link.
- festivals: name required; concert_ids defaults to [].
- user_concerts: user_id, concert_id required; document ID is `<uid>_<concertId>`; supporting_artist_ids defaults to []; notes defaults to empty. Selected supporting artists are those seen or planned, from the concert lineup. Ownership and concert identity cannot be reassigned.
- users: document ID is verified Gmail local-part; user_id required; username is the verified Gmail local-part. There is no display name or profile editor. Existing legacy name fields are ignored. No auth email/token is stored in this public collection.
- admins: console-managed document ID is Firebase UID; enabled: true, email: dcep93@gmail.com. No client can write this collection. Admin authorization additionally requires the matching verified Gmail Google account.

All application data is publicly readable, including personal notes. Admin registry reads are allowed to its authenticated owner only. Authentication credentials stay in Firebase Auth. Anonymous writes are denied. Only verified Google Gmail accounts can write. Owners can create/update/delete their profile and their user_concerts; admins can edit all application records. Identity checks live in database rules, not only React.

Venue-local datetime entry converts to an exact UTC instant with an explicit venue zone. Display uses that zone, never the browser's zone. Nonexistent DST times are rejected; repeated times require an explicit earlier/later selection. Changing venue timezone does not silently change existing event instants. Unknown/missing times are displayed safely, not as the current date.

## Evolution and integrity

Keep types, normalizers, time conversion, and writes centralized. Optional data has defaults. Updates patch only known edited fields, preserving unknown future fields. Rule validation protects identity, types, and essential fields without allowlisting every document key. Optional-field defaults are used in rules. Client forms validate referenced entities and URLs. Referenced catalog entities cannot be deleted through the app until their references are removed; removing a concert from one log never deletes the concert. Renaming entities preserves IDs and links.

## Implementation and setup

React/TypeScript/Vite frontend, Firebase Auth/Firestore client, Luxon for IANA time conversion. One provider exposes normalized catalog and public log data, auth readiness, loading/error states, and console-managed admin status. Writes are separate helpers. Firebase's public web config is available from Hosting's `/__/firebase/init.json`; it contains no server key. Development can connect to local Auth and Firestore emulators only when explicitly enabled in development.

App code, rules, tests and setup docs live under app/src/app_x. Necessary dependency/lockfile and deployment changes are part of this approved app implementation. Keep existing automatic Hosting deployment. Database rules are deployed through a documented one-off setup command using an authenticated Firebase CLI; do not silently create a production database, seed production fixtures, or claim Google authentication was tested without a real sign-in.

Local GCP credentials are not present. Provide setup instructions for creating the default Firestore database, enabling Google sign-in, setting authorized domains, deploying rules, and creating the sole admin registry entry after first sign-in. Use a demo project for all automated emulator fixtures.

## Verification

Test anonymous reads/writes, verified Gmail versus unverified/non-Gmail/non-Google identities, owner and cross-owner create/update/delete, immutable ownership, admin catalog and other-user writes, blocked role escalation, optional fields and unknown-field preservation. Test dates across IANA zones and DST gaps/repeats, routes with stale slugs, missing records, schema defaults. Run production build and lint. Use emulator fixtures for desktop/mobile browser checks of login, user log, add/edit/remove, entity routes and public notes. Preserve explicit production setup limitations in final handoff.

## Minimal interface

Keep visible text functional. No slogans, marketing copy, decorative music notes, footer branding, or Find user navigation. The login page has only the app title and Google sign-in button. Do not render account eligibility instructions; show validation errors only when needed. Public user pages remain accessible by their URLs. Empty logs say “No concerts” and use the existing header action to add a concert. Preserve the shared pink Comic Sans styling.

The minimalism audit also removes decorative image initials, redundant link arrows and plus icons beside text labels, oversized empty states, all-caps eyebrow styling, conversational placeholders, and helper text that repeats available controls. Actual supplied images and user-written notes remain data. Use short factual labels (“User logs”, “No entries”). Keep only guidance needed to make a decision: public notes, venue timezones, ambiguous dates, validation errors, and concise deletion confirmation.

Auth and catalog loading render blank space, without status copy or spinners. The header waits for the initial verified identity and admin result, then renders account controls together. Token refreshes preserve that confirmed session; only an actual account change clears it. The upper-right username is plain text, not a link or button. The brand remains the home link.
