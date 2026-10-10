# Feed image fallback

Concert rows should try the primary artist image, then the venue image when the artist or its image is missing, invalid, or fails to load. Omit the image if neither works. Use the name of the displayed artist or venue as alt text.

Pass venue image/name to the existing Picture component in ConcertRow, matching EntityPage. This covers every list using ConcertRow without adding fetching or changing catalog data. Preserve current sizing and styling. Verify an existing venue-only row and an artist row in the browser, run lint/build, and deploy through GitHub.
