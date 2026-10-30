# Live NFL viewing refinement — 1.519.0

Full play descriptions are always visible in Clubhouse and the replay game
browser. There is no disclosure control or extra tap. Headlines are 14px and
source descriptions are 13px with a 1.5 line height at the default text size.
Touchdowns and big plays retain a compact 16px result; ordinary plays no longer
repeat a separate result above the complete source description. Clock gutters,
row padding and score totals are smaller without shrinking control targets.

Fantasy players retain two NFL team columns. Shared intrinsic grid tracks align
names, points, metadata, owner labels and stat lines across the two sides, even
with unequal name or description lengths. Points sit beside names, with scoring
units beneath. Default names are 13px, points 18px and stat lines 12px. Player
buttons still have 44px targets. Rows have consistent inset padding and subtle
separators; your roster retains its theme accent. Enlarged text moves points
below full-width names, with no fixed heights or clipped content. Browsers without
subgrid retain two independent readable team columns.

Actual NFL scores, exact league/PPR values, zero/negative/unknown values, original
descriptions, nullified-play handling, player routes and clip buttons retain their
meanings. Polling, saved reading positions and the existing shared transitions
remain. No data request, runtime dependency or animation loop was added.

## Validation

- `pnpm check`: 2,404 tests / 291 files and release/themes/types/names/build.
  Final focused NFL tests: 33 tests / four files. Final themes/types/names/build
  pass. Bundle remains 90 modules, three startup/four Home; 57 shared CSS sheets
  remain in one request.
- 124 focused browser checks: Light/Dark at 320/390/768px, full descriptions
  always visible, smaller hierarchy, aligned player fields, 44px targets, contrast,
  200% text, exact points and neutral nullified plays/filters.
- 62 live-refresh checks: automatic updates, stable reading anchors, Latest
  counts, mode/game return, visible descriptions, offline/errors, modal covering,
  final-game cadence and listener cleanup.
- 244 full Clubhouse/replay browser checks cover player cards, clip navigation,
  fantasy columns, text enlargement, exact reading return and video retention.
- Real built app verified read-only in Light/Dark, both views, with game
  401873023 (142 observed plays and 20 player stat rows). Both modes fit with
  readable contrast and no browser errors; counts change during live games.
- Test harnesses block production writes. Physical phone frame timing,
  screen-reader speech and older browsers without subgrid remain unmeasured.

Screenshots and check results: [live-game-density-1519/](live-game-density-1519/).
