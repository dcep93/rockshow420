# Event date/time purchase links

Remove the visible Ticket status label from the concert controls, preserving the dropdown's accessible name. Link the displayed event date/time to its purchase_link on every event display: feed rows, artist/venue related rows, and concert detail heading. Date-only and festival date ranges use the same link. Without a valid HTTP(S) purchase URL or usable date, render plain text.

Use a shared ConcertDate component to preserve formatting and cancellation brackets. Keep ticket symbols outside the date link. Open purchase pages in a new tab and use the existing subtle underlined link treatment. Festival set times remain set-specific schedule information, not separate event dates.

Verify linked/unlinked/invalid URL/date-only/cancelled variants with rendered tests, check the live-data feed/detail/artist/venue views and the unlabeled dropdown in Chrome, run lint/build, and deploy via GitHub.
