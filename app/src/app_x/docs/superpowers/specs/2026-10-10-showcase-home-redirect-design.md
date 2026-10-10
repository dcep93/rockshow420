# Temporary showcase homepage

Approved with `yesi` on 2026-10-10.

Visiting `/` redirects every visitor to `/user/dcep93` using the existing client router and history replacement. The redirect does not wait for authentication and never renders the login form at `/`. The public log uses its existing public data and permissions.

Move the existing login page to `/login` and update the guest Sign in link. Successful login still opens the signed-in user's own log. Keep signed-in home navigation unchanged; guest home navigation opens the showcase log. Sign-out returns through `/` to the showcase.

Use a small, commented routing change rather than a permanent hosting redirect or a configurable showcase subsystem. Existing styles, error handling, and data access remain unchanged. To undo the showcase, restore the previous home redirect and login route behavior from Git.

Verify the build, lint, existing unit checks, guest homepage redirect, login link, and browser back navigation. Update the existing browser login helper and rejected-login URL to `/login`. Commit and push main, then verify the deployment.
