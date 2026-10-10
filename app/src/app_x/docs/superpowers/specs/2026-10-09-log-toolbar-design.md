# Compact log toolbar

Place the concert count, hidden toggle, search field, and setlist checkbox in one left-aligned row on desktop. Keep the existing controls, labels, and filtering behavior. Let the two control groups wrap naturally on narrow screens, with the search field shrinking to fit. Preserve the existing theme and touch target sizes.

Move the search group into the user heading in UserPage.tsx. Adjust only the corresponding flex layout and spacing in layout.css. Verify desktop alignment, narrow-screen overflow, and filtering in the browser; run lint and build. Commit and push through the existing GitHub deployment.
