# Feed scroll memory

Remember each user's feed scroll position in module memory for this page session. Capture the outgoing feed position before navigation resets scroll. Restore it in a layout effect after the feed content is mounted, so browser Back, the brand/home link, and Escape return to the same position without a visible top-first jump. New detail routes still start at the top.

Retain search text, Search setlists, and Show hidden in the same per-user memory so restoration returns to the same list. No storage, database writes, network requests, or persistence across reloads. Each username has independent state. Keep browser history scroll restoration manual while the router is mounted to avoid competing native restoration.

Add a small pure memory module, integrate outgoing capture into the existing router's popstate handler, and restore/store view state from UserPage. Test memory merging and isolation, then use Chrome to verify deep feed navigation, Back, home, Escape, filters, and reload reset. Run lint/build and deploy through GitHub.
