# Firebase setup and local verification

The app uses the `concertboxd` Firebase project. Its public Firebase web
configuration comes from its registered Concertboxd web app and is
checked into `data/firebase.ts`; these values are client identifiers, not a
service account key. No production database creation, rule deployment, seed, or
real Google sign-in is performed by automated tests.

## One-time production setup

1. Open [Firestore for concertboxd](https://console.firebase.google.com/project/concertboxd/firestore),
   click **Create database**, and create the **(default)** database. Choose the
   appropriate permanent location and production/locked rules. Do not use test
   mode. The app uses the default database, not a named database.
2. Open [Authentication](https://console.firebase.google.com/project/concertboxd/authentication/providers),
   initialize Authentication if needed, and enable **Google** under Sign-in
   method. Select a project support email. The app only accepts verified
   `@gmail.com` Google identities; Workspace/non-Gmail accounts are rejected.
3. Under Authentication → Settings → Authorized domains, verify
   `concertboxd.web.app` and `concertboxd.firebaseapp.com`. Add any actual custom
   Hosting domain. Add `localhost` only if using production Google sign-in from
   local development; the default local test path is the Auth emulator.
4. GitHub Actions backs up and validates the six tables, then deploys the
   checked-in Firestore rules/indexes and Hosting on each push to `main`.
   Authentication uses Workload Identity Federation with the deployment account
   `deployer-github@concertboxd.iam.gserviceaccount.com`; no stored service-account
   key or local Firebase login is needed. The provider is restricted to this
   repository's numeric ID, owner ID, and `refs/heads/main`.

   The deployment account has Firebase Hosting Admin, Firebase Rules Admin,
   Cloud Datastore Viewer, Cloud Datastore Index Admin, and Service Usage
   Consumer. Routine deployment can read application data for backup and
   verification but cannot edit it. One-time migrations are separate console
   operations and never run automatically on a push.

   To deploy manually from an authorized Firebase console Cloud Shell, use the
   checked-in `firebase.production.json` after building the app and copying
   `dist` to `src/app_x/backend/hosting-dist`. Do not place credentials in the repo.

5. Open the deployed app and sign in as **dcep93@gmail.com**. Find this account's
   UID under Authentication → Users. In the Firestore console create
   `admins/<that UID>` containing exactly these authorization fields:

   | Field | Firestore type | Value |
   | --- | --- | --- |
   | enabled | boolean | `true` |
   | email | string | `dcep93@gmail.com` |

   The live app observes this document. Admin rights require all of: this
   console-created enabled entry, the matching UID, the exact email, email
   verification, and a Google sign-in token. A registry entry for any other
   email cannot grant admin access. No browser client, including the admin,
   can write the `admins` collection.

## Local emulators

Use Node supported by the installed Firebase CLI and Java 21 or later on PATH.
All commands below run from `app`. Fixtures and rules tests use the demo project
`demo-concertboxd` so they cannot target the production Firebase project.

```sh
npx firebase emulators:start --project demo-concertboxd --config src/app_x/backend/firebase.json --only auth,firestore
```

In a second terminal:

```sh
VITE_USE_EMULATORS=true npm run dev -- --host 127.0.0.1
```

Auth listens on `127.0.0.1:9099`, Firestore on `127.0.0.1:8080`, and the emulator
UI on `127.0.0.1:4000`. Choose a verified Gmail identity in the emulated Google
flow. Emulator admin testing still requires the matching email and an enabled
admin registry document, created through the emulator UI. Nothing in the app
automatically grants admin or creates catalog fixtures.

Emulator connections require **both** Vite development mode and
`VITE_USE_EMULATORS=true`. Production builds always connect to production, even
if that environment variable is set at build time. Stop emulators when done.

## Automated checks

```sh
npx tsx --test src/app_x/tests/model.test.ts src/app_x/tests/session.test.ts
npx firebase emulators:exec --project demo-concertboxd --config src/app_x/backend/firebase.json --only firestore 'npx tsx --test src/app_x/tests/rules.test.ts'
npm run build
npm run lint
```

Security tests reset only the demo emulator database and cover public reads,
anonymous and invalid-identity denials, owner and cross-owner operations,
immutable log identity, deterministic IDs, lineup subsets, optional fields,
unknown-field preservation, blocked role escalation, and console-only admin
authorization. Date tests cover timezone-local display and DST gaps/repeats.
Real Google popup behavior, authorized production domains, and production
permissions must be verified after the project owner finishes the setup above.

## Data and operations

- All six application collections are public, including users' concert notes.
  Firebase Auth holds credentials; public profiles do not store auth email or
  tokens. Profile IDs are verified Gmail local-parts.
- Concert dates are Firestore Timestamps. Each venue has an explicit IANA zone.
  The editor rejects DST gaps and asks which instant to use during repeats.
  Changing a venue zone does not rewrite stored concert instants.
- Catalog editors patch known edited fields and preserve unknown fields.
  Missing optional fields remain supported. Every catalog concert appears in every user log by default. Hiding a concert
  stores `removed: true` on that user's `user_concerts` record and preserves annotations.
  Unhiding it clears the flag. Saving defaults deletes the override (or skips creating it),
  unless unknown future fields need preserving. Existing records need no migration.
- The app blocks catalog deletion when its loaded public catalog contains an
  incoming reference. Firestore rules cannot perform arbitrary reverse-reference
  queries, so console operations or concurrent administrative edits still need
  care. Refresh the app before deleting records; repair any missing references
  through the admin editor.
- To revoke admin, set `admins/<UID>.enabled` to `false` using the console.
  To deploy later rule changes, commit and push them to `main`.

## Browser verification

With the local Auth/Firestore emulators and Vite development server running as
above, install Chromium and run:

```sh
npx playwright install chromium
npm run test:browser
```

These tests reset the local demo database and Auth accounts, then create sample
artists, venues, concerts and users. They never connect to production. Coverage
includes public pages on desktop/mobile, cosmetic URL slugs, Gmail-only popup
sign-in, inline owner edits, hidden-log display and unhide, default-override cleanup, admin record creation,
missing-reference repair, exact-timestamp and unknown-field preservation, and
DST gap/repeat entry. Screenshots and failure traces go to `/tmp/concertboxd-checks`
and `/tmp/concertboxd-browser-results`.

`npm test` runs the model/timezone checks. `npm run test:rules` launches an isolated
Firestore emulator for authorization checks; stop any existing emulator on port
8080 before running that command.
