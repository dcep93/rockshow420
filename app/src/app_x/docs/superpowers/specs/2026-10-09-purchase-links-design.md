# Concert purchase links

Store optional `purchase_link` HTTPS strings on concert records in `tables/concerts`. Missing or empty means no known link. Preserve compatibility with all existing concerts. Admin management can edit or clear the field using its existing Save flow; no public UI additions are needed.

Populate all 17 upcoming concerts, including hidden entries, using the existing venue-local next-day 6am cutoff. Prefer official event-specific ticket pages with matching artist, date, and venue. Where the stored event has no session time, use the official event page offering its sessions. Store research sources in an immutable catalog revision, not in Firebase records. Leave personal logs, ticket statuses, dates, and lineups untouched.

Deploy through the existing GitHub workflow with backup, schema validation, atomic preconditioned writes, and revision receipts. Reject concurrent changes to researched fields, including a purchase link added after research. Verify normalization, schema preservation, replay safety, lint/build, and production links after deployment.
