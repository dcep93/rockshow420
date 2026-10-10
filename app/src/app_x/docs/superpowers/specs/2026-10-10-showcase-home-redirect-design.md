# Temporary showcase homepage

Approved with `yesi` on 2026-10-10.

Visiting `/` redirects every visitor to `/user/dcep93` using the existing client router and history replacement. The redirect does not wait for authentication and never renders the login form at `/`. The public log uses its existing public data and permissions.

The upper-right Sign in button opens the existing Google popup directly and keeps the current page after login. No separate login route is needed, as clarified by the user. Keep signed-in home navigation unchanged; guest home navigation opens the showcase log. Sign-out returns through `/` to the showcase. Disable Sign in while its popup is pending and display failures using the provider's existing error state.

Use a small, commented routing change rather than a permanent hosting redirect or a configurable showcase subsystem. Existing styles, error handling, and data access remain unchanged. To undo the showcase, restore the previous home redirect and login route behavior from Git.

Verify the build, lint, existing unit checks, guest homepage redirect, sign-in popup, and browser back navigation. Update the existing browser login helper to use the header button and explicitly visit its test user's log; rejected login stays on the showcase log. Commit and push main, then verify the deployment.
