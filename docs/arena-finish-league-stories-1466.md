# Arena finish and league stories — 1.466.0

The stadium's existing podium and the older table-only results page now share
one official finish presentation. Larger character art uses the same member
identity, saved uniform and lane number as the field; the editable jersey number
remains part of the uniform. The winner gets a raised-arm pose, followed by all
official places, current team names, times and gaps to three decimal places.
Unknown historical times remain unknown. Incomplete or conflicting result sets
cannot reveal a podium. The duplicate live classification is hidden while the
official result is visible and restored during replay; replay hides the entire
official result. Existing replay, orientation and commissioner controls remain.

The finish reveal uses one bounded sequence of opacity/transform animations.
Character art is drawn once, without a new race loop. Repeated snapshots retain
the finish nodes. App motion-off, reduced motion, visibility changes and route
cleanup cancel pending reveal effects. The archived view uses the existing
snapshot RPC and member directory, with no command or new schema. Its async
generation guard prevents a late response from replacing the next page.

Home still has its independent, daily opening slide. The existing single weekly
supporting result now prefers a verified rivalry streak ending, a new season
high, three or more consecutive losses, or four or more consecutive wins. The
named subject is marked in the complete score rows. The personal matchup is
excluded. Current team names and the existing recap link come from the verified
completed report; no generated claims or additional data requests are used.

History rules collapse repeated syncs, stop on ties, unknown/conflicting scores
and missing weeks, and exclude the selected and future weeks. Season-high claims
require every earlier week and the complete league field. Sparse history falls
back to the existing weekly score story. No record is claimed from a projection.

## Validation

- `pnpm check`: release agreement, theme/name/type checks, 2,043 tests in 248
  files and the production bundle passed. The new tests exercise official ordering, unknown times,
  duplicated/foreign results, independent race/jersey numbers, actual story
  subjects, personal exclusions, stale reports, coverage gaps and conflicting
  rivalry receipts.
- `tools/capture-finish-stories.py`: 46 production-component browser cases,
  Light/Dark at 320/390/430/768px, fields of 2/12/32 racers, complete long names,
  native focus targets, all three new story compositions at phone widths,
  transport clearance, motion-off, reduced motion, mid-reveal cancellation and
  teardown. [Machine-readable checks](arena-finish-league-stories-1466/component-checks.json).
- The full stadium controller review covers official-result routing, saved
  uniform identity, a single complete classification, replay spoiler suppression,
  archived result loading/cleanup and the existing controls/orientation/race
  regressions. All browser data uses isolated local fixtures.
  [Controller checks](arena-finish-league-stories-1466/arena-checks.json).

Screens inspected: [Light phone finish](arena-finish-league-stories-1466/finish-light-320.png),
[Dark phone finish](arena-finish-league-stories-1466/finish-dark-390.png),
[losing streak](arena-finish-league-stories-1466/story-light-320-losing-run.png),
[rivalry result](arena-finish-league-stories-1466/story-dark-390-revenge.png),
[season high](arena-finish-league-stories-1466/story-light-390-season-high.png).

Physical iPhone/Safari frame pacing and low-power mode remain unverified.
Fixtures do not change league data or create an actual race. Historical uniforms
are the member's currently saved appearance, as in the existing race viewer;
there is no new claim of a uniform snapshot from the original race date.
