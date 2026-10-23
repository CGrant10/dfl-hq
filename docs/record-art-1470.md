# 1.470.0 — Live record chases and league artwork

GameDay Watch and the selected Clubhouse matchup now show a compact Record watch
below the lineup when either team is within 30 points of a verified scoring
benchmark. League, team and current-season targets use the existing archive,
stable owner IDs and matching scoring settings. The current week is excluded.
Ties require another 0.01 points to beat the target. Live clearance says “Above”;
only a completed matchup says “New.” Missing or incomplete history suppresses
unverified targets rather than manufacturing a record.

A read-only check of the production archive returned 730 of 730 matchup rows.
Comparable scoring begins in 2021; 2017–2018 have no weekly score receipts and
older formats differ. The verified same-scoring league benchmark is 202.76,
The Bayou Bombers, 2023 Week 10. These are recorded same-scoring benchmarks,
not an all-time claim. The existing archive request now includes an exact count
to detect truncation. No database, schema, scoring or notification writes were
made. Supabase skill instructions were applied to the read-only source checks.

Each of the 12 current owners has original decorative team artwork. Matchup
introductions show the art alongside the selected DFL/Sleeper photo, final
receipts show the winner's art and profile headers use a faint illustration.
Names and chosen photos remain independent of the art and update normally.
Unknown owners receive no invented mapping. Ties have no winner illustration.
There are no changes to broadcast artwork or app shield placement.

The shared transparent WebP atlas is 540,904 bytes. The artwork is requested
when used and precached with the release for offline use; the startup fixture
does not request it. No additional score poll, animation loop or scroll listener
was added. A newly crossed record gets one finite 380 ms reveal only while
visible and fresh. Initial visits, reopening, stale/hidden updates, unchanged
syncs and corrections do not replay a celebration. Motion-off and reduced
motion retain static scores and progress.

## Validation

- `pnpm check`: 2,062 tests in 250 files; release, theme, type, name and production
  build checks passed. Final type/name/theme/build checks passed after cleanup.
  Application bundle remains 79 modules, with 3 startup and 4 Home modules.
- 15 new unit cases cover matched formats, complete history, deduplication,
  conflicting ownership, invalid data, weekly ownership, exact targets,
  current names and stable artwork mapping.
- 64 focused browser checks use the actual Watch and Clubhouse controllers,
  record model, selected portrait renderer, final receipt and profile builder.
  Light/Dark at 320/390px: full names, loaded photo bounds, contrast, exact
  scores, bounded crossing effects, repeated syncs, corrections, stale/hidden
  states, late archive arrival, wrong-week events, motion preferences and
  teardown. All 12 artwork windows have transparent boundaries without clipping.
  No browser errors or backend writes.
- Existing final-receipt browser checks passed, including ties, close finishes,
  blowouts, sharing, replay, archived results and cleanup.

Inspected [Light records](record-art-1470/light-320-record.png),
[Dark records](record-art-1470/dark-390-record.png),
[Clubhouse records](record-art-1470/dark-390-clubhouse-record.png),
matchup introductions in [Light](record-art-1470/light-320-entrance.png) and
[Dark](record-art-1470/dark-390-entrance.png),
finals in [Light](record-art-1470/light-320-final.png) and
[Dark](record-art-1470/dark-390-final.png),
profiles in [Light](record-art-1470/light-320-profile.png) and
[Dark](record-art-1470/dark-320-profile.png), and the
[12-team artwork sheet](record-art-1470/all-twelve-dark.png).
[Focused browser results](record-art-1470/checks.json) are retained with the captures.

Real iPhone/Safari frame pacing, low-power mode and high-refresh hardware remain
unverified. Artwork is decorative and carries no screen-reader identity; names,
chosen photos and record progress keep their existing accessible controls.
