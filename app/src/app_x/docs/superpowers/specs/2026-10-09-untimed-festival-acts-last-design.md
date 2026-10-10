# Untimed festival acts last

Each festival day displays sets with start times in descending chronological order, followed by sets without start times. Keep programme-day grouping (including performances after midnight), chronological day order, and the final unknown-day group. Preserve the current reverse stage/ID tie ordering and avoid mutating source schedules.

Make groupScheduleDays return display order and remove the component's whole-day reverse. Update its existing regression test with mixed timed/untimed sets, multiple untimed acts, an unknown-day group, timezone offsets, and after-midnight assignment. Verify tests, lint, build, and a real festival page; deploy through GitHub.
