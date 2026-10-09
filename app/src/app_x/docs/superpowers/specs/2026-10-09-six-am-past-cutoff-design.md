# Six AM past cutoff

User requirement: events move to Past only at 06:00 the following day in the event timezone.

Use the venue timezone to obtain a timed concert's local calendar date; date-only records retain their literal calendar date. An end_date takes precedence for multi-day events. The cutoff is 06:00 on the next local calendar day, calculated as calendar arithmetic so daylight-saving transitions do not move the wall-clock hour. Before the cutoff is Upcoming; at or after it is Past. Invalid dates remain unknown, and absent/invalid timezones retain the UTC fallback. The existing minute/focus refresh remains unchanged.

Keep this calculation in concertPeriod, without schema or UI changes. A fixed elapsed-hour delay would vary by showtime and daylight saving, so it does not satisfy the requested calendar boundary. Validate exact boundaries for timed, date-only and multi-day events, UTC/local date differences, both daylight-saving transitions and invalid dates. Commit/push the tested change and verify GitHub deployment.
