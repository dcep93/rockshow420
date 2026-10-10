# Detail page images

Artist and venue detail headings render their saved image URLs using the existing compact Picture component. Concert headings try the headliner image, then the venue image if the artist image is absent, invalid, or fails to load. Alt text identifies the displayed subject. If neither loads, omit the image without an icon or empty placeholder. Keep existing fixed image dimensions while an image loads.

The user authorized image sourcing for all artists and venues. Use verified Spotify artist identities, official sites, and reviewed venue sources. Record source URLs and selection basis alongside the immutable catalog correction; never fill gaps with a guessed namesake, unrelated graphic, or stock image. The coverage report explicitly lists unresolved records.

Populate the existing optional image fields. No schema changes, additional Firestore documents, or extra app reads. Extend the existing reviewed catalog corrections to support artists and venues; guard the original image value or its absence, preserve all other fields, and apply the revision atomically through GitHub after its production backup. Deployment receipts preserve later admin edits on redeploy.

Validation: browser fixtures exercised primary images, missing/broken primaries, broken fallbacks, no-image records, and correct alt text. Browser galleries reviewed venue and non-Spotify selections; HTTP checks verified image availability. Migration tests and a projection against all six production tables verify idempotence, edit guards, unchanged personal/catalog fields, and document sizes. Lint, TypeScript/build, 44 application tests, and 21 cache tests pass. Deployment and live readback complete the check.

See ../../detail-images-review.md and ../../detail-images-sources.json for coverage and provenance. External image URLs can change; failures are handled by the Picture component.
