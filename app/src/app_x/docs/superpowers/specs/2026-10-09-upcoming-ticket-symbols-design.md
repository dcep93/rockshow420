# Upcoming ticket symbols

Append the user's ticket symbol to the existing date/time line for upcoming concert rows: purchased $, sold_out %, cancelled !, empty no symbol. For date-only events append after the date. Preserve cancellation brackets and omit symbols for past or unknown-date events. Use the existing venue-local 6am cutoff, with UserPage's current time passed through so the column and symbol agree on refresh.

Share the symbol mapping with clipboard export in model.ts. Render a small inline span with the full status as its title and accessible label. No schema or database changes. Verify all statuses and the cutoff using rendered component tests, run existing export tests plus lint/build, inspect real upcoming rows, and deploy through GitHub.
