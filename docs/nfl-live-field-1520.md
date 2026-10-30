# NFL live field and team identity — 1.520.0

Clubhouse and the replay game browser now place a compact, wide football field
above the play feed. Official start/end spots drive the ball movement; a blue
start marker and dashed gold line show the recorded line to gain. Field numbers
mirror 10–50–10 and end zones use the actual two teams. The latest view shows the
next down and current possession when provided. Gains, losses and zero remain
exact; touchdowns get one restrained end-zone pulse, turnovers show the change
of possession, and red-zone possession is marked in the header. This is recorded
field movement, not reconstructed player routes.

Play rows use the offense's existing NFL primary/secondary colors for their
rail and marker, alongside an explicit team code. Text retains shared theme
colors. Neutral rows are kept when the feed does not identify a team. Full play
descriptions and the compact type/spacing from 1.519 stay visible. A play with
verified geometry has a 44px headline button to replay it on the field; Latest
and Back to play controls preserve access to the live field and source row.
Historical field selection survives updates. Missing locations are not plotted.

The active live refresh cadence is five seconds after each completed cycle. The
live board cache supports five-second freshness and shares in-flight reads;
other consumers retain their default twenty-second cache. The existing summary
cache still avoids another detailed network read for ten seconds. Earlier board
plays appear before a delayed summary completes and are replaced by the same
confirmed row without duplicates or repeat animation for metadata-only changes.
Older board plays cannot replace newer detailed plays or roll back a newer score.
Repeated cached stat arrays do not trigger an extra full feed patch.

The field uses inline SVG and one-shot transform/distance/opacity animation via
the existing motion controller. It adds no third-party library, animation loop,
backend task or new data provider. Motion off and Reduced Motion show final ball
positions. Mode changes cancel field motion without cancelling other UI effects.
New source modules are included in the offline shell. Polling retains the existing
visibility, offline, modal, final-game, non-overlap and teardown protections.

## Validation

- `pnpm check`: 2,414 tests / 293 files, release/themes/types/names and build.
  Final focused tests: 45 / seven files, plus themes/types/names/build. Build
  remains 90 application modules, three startup/four Home and 57 shared CSS
  sheets in one request.
- 74 field browser checks in Light/Dark at 320/390/768px: field orientation and
  numbering, current down/possession, team rails, controls, contrast, 200% text,
  historical return, early/confirmed plays, no duplicate animation, TD/turnover/
  nullified/missing data and motion preferences. CI includes this review.
- 124 existing compact NFL UI checks, 62 live-refresh checks (including the
  five-second cadence) and 244 full Clubhouse/replay checks pass.
- Real built app reviewed read-only in both views and themes for game 401873023:
  191 observed plays and 21 player stat rows, with readable contrast, no overflow
  or browser errors. Counts can change during the game. Mutation calls blocked.
- Live delivery still depends on provider publication and response time; no
  guarantee of beating a TV broadcast. Physical phone frame pacing and screen
  reader speech remain unmeasured.

Evidence: [nfl-live-field-1520/](nfl-live-field-1520/).
