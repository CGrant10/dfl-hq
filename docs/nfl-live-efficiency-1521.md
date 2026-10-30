# Live NFL efficiency — 1.521.0

A newly announced scoreboard play now bypasses the detailed summary cache. The
existing cache and shared pending request remain in use between plays; the live
cadence remains five seconds after each completed cycle. The source is still the
existing public ESPN feed, with no additional provider or paid service.

Automatic refreshes with an existing play feed no longer render at request start.
Unchanged markup skips the DOM reconciliation and reading-anchor measurements.
The refresh indicator remains available for initial/manual reads and reconnects.
Empty views stay steady while existing data refreshes. The Latest button writes
its hidden attribute only when visibility changes. Only the visible view computes
its player/play rows; a changed context still updates the visible fantasy scores.

Weekly Sleeper stats load on demand when the fantasy view opens, and continue
checking their existing 20-second freshness while that view is active. Concurrent
reads are shared. Results are checked against the current week, mode, visibility
and lifecycle before applying; failed reads retain previously verified data.
Play-only viewing does not launch these weekly-stat reads.

Reading-position work is coalesced into one animation-frame callback rather than
every scroll event. Suspension cancels queued scroll work and field animation.
Automatic updates skip animation for a field scrolled out of view; explicit replay
retains motion. Existing hidden-tab, offline, modal, final-game, non-overlap and
teardown protections remain. No extra timer, dependency or backend work was added.

## Validation

- `pnpm check`: 2,415 tests / 293 files; release/themes/types/names/build pass.
  Final types/names/build also pass. Bundle remains 90 modules, three startup/four
  Home, with 57 shared CSS sheets in one request.
- 72 live-refresh browser checks in Light/Dark: an unchanged automatic poll
  produces **zero DOM mutations** and play-only viewing makes **zero weekly-stat
  loader calls**. Opening Fantasy loads those stats; a new board play forces the
  detail read on an automatic poll; offscreen field animation stays stopped.
  Reading anchors, new-play counts, clips, modal/hidden/offline handling, no
  overlapping reads, final polling and teardown pass.
- 75 field checks, 124 compact NFL UI checks and 244 full Clubhouse/replay checks
  pass, including motion preferences, exact points, player routes, large text,
  full descriptions, two-column stats and video retention.
- Built app reviewed read-only at 390px in Light/Dark, plays/fantasy, for final
  game 401873023: 196 play rows and 21 player stat rows. Both modes fit, contrast
  passes and no browser errors occur. Production writes blocked.
- DOM mutation/request counters measure avoided work; physical phone energy use,
  frame pacing and end-to-end live publication latency remain unmeasured.

Evidence: [nfl-live-efficiency-1521/](nfl-live-efficiency-1521/).
