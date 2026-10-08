# Typed song sources and clean current schema

Approved by user with yesi on 2026-10-08. Work remains local: no commit, push or hosting deployment.

Every current song-list payload has a required kind: setlist_fm, musical_program, or spotify_top_tracks. Preserve ordered songs, sections, relevant notes and exact source links. Setlist.fm remains keyed by artist/concert; musicals are keyed by concert and identify their production/basis; Spotify is keyed by artist and represents the current public top-ten order, not songs performed at any particular show. Include supporting and future artists. Capture fewer than ten only when Spotify actually supplies fewer, and report the exception. Do not guess artist identity.

Use versioned static JSON, with successful retrieval timestamps and immutable content revisions separate from display data. Current caches use only the new schema. Historical revisions remain historical evidence, including the old verbose sample, outside the current app data imports. Clean the existing Khruangbin current payload and explain this distinction. No API access for song discovery. Minimal expandable JSON/source disclosures distinguish all three kinds; no loading copy.

Fetch musical programs for Hamilton, Phantom of the Opera, and Illinoise from official production/program sources. Standard production programs must be labelled as such rather than asserted to be exact date-specific performances. Do not substitute plays, movie scores, tribute acts or festival lineups without evidence.

Audit raw database fields, references, empty user diffs and migration state. The user's clean-database request authorizes removing verified obsolete data after a fresh durable backup and validation, but not guessing away meaningful import provenance or changing concert identities. Quota-blocked fresh reads are a hard external blocker to live cleanup. Keep a precise report of remaining legacy data and deployment dependencies; never claim production cleanup from local snapshots. Existing production hosting must remain functional until an authorized cutover.

Document ambiguous matches, missing sources, duplicate/renamed performers, cancelled events, uncertain dates/times/venues and absent artist references. Festivals, multi-admin access and user-specific concert ownership remain future work. Shared song caches must not depend on the current user's attendance or username.

Verification: schema/hash integrity, retention of old revisions, kind-based rendering, no accidental Spotify data counted as actual setlists, tests/build/lint and localhost inspection.
