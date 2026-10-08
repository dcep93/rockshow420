# Compact setlists for the full saved catalog

The user approved the compact content-only design with “yeah - do em all, let me know how it progresses.” This supersedes the verbose sample payload. Proceed without another approval checkpoint.

Each artist/concert key maps to a source URL, ordered sets/encores and ordered songs with optional notes/tape flags; optional whole-show notes. Artist/venue/date, page markup, tooltips, editor details, links to song statistics and show times stay out of the payload. Existing records are converted to schema 2, retaining schema-1 revision files as history. Fetch metadata remains separate.

Use the latest available saved production snapshot and verified overlays because live Firestore reads remain quota blocked. Cover every saved concert and every listed supporting artist irrespective of user selections. Record future events, missing artist identities, empty setlists, no matches, ambiguous matches, and fetch failures separately. Do not fabricate data or equate a failed search to proof that a setlist does not exist. A festival without a listed artist requires review; do not invent an artist ID or expand a festival into an unrequested lineup.

Use existing source URLs first, then the public website search and links to same-date performances. Verify artist, event date and venue before associating a source with app IDs; aliases must be supported by evidence or left for review. Public HTML only, sequential requests with spacing, stop network work on rate-limit/access blocks and preserve all completed results. Cache responses locally and resume without refetching successful pages. No API, billing, production database mutations, deployment, commit or push.

The raw JSON component stays minimal and resolves artist labels from the app catalog. Cache data is loaded in a separate build chunk so it does not inflate the initial application chunk. Progress reports distinguish verified cached performances from attempted or unresolved entries. Focused tests cover compact data, version migration and source matching; build/lint and browser sanity checks complete the work.
