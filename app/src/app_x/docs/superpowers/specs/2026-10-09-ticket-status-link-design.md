# Ticket status purchase link

On concert pages, render the existing Ticket status text as a link when the concert has an HTTP(S) purchase_link. Open it in a new tab with noreferrer. Keep the text plain when there is no usable link. Preserve its position above the dropdown, give the dropdown the accessible name Ticket status, and show a subtle underline on the link. Do not add another button or modify ticket status behavior.

Verify the new Samantha Fish event links to its saved Ticketmaster event, check the plain fallback on a concert without a link, and run lint/build before GitHub deployment.
