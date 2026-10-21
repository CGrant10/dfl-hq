# Arena scale and race drama — 1.453.0

Portrait now uses a taller field rather than a 16:9 inset. The production
renderer's atlas frames measure about 35 CSS pixels at 320/390px and 46px at
768px, versus roughly 9px in the former 390px phone view. All racers and both
endzones stay visible, including the edge lanes. Landscape continues to show
all racers within its available height; the 4× size improvement is specific
to the portrait phone view. No close-up or split-screen camera is added.

Player drawings replace the oversized floating number blocks as the primary
identity. Unsaved uniforms use the racer's accent or lane palette; saved gear
keeps its colors, skin, helmet and number. Stride phase follows traveled distance
instead of multiplying accumulated time by changing speed. Final approaches
add a small forward lean, and crossed places are more readable beside the goal.

New draws carry `presentation_version: 2`. Their deterministic, monotone paths
stretch the field into sustained breakaways and comebacks. In the isolated
12-racer seed the maximum spread increases from a few yards to about 22 yards,
with five distinct leaders. Official randomized order, server clock and exact
finish times retain the existing protocol. A pause, duration edit, late join
or replay derives the same normalized positions. Draws without the new marker
use their original paths. Unsupported future versions require an app update.

Calls now measure actual rank gains, lead changes and gaps over shared
three-second windows. They use team names when available and never use sealed
finishing places to announce a pass. Optional sound adds finite filtered crowd
swells for overtakes, launch, final sprint and finish. Pause, sound-off, hidden
tabs and route cleanup silence/release active voices. There is no new audio or
animation loop. Motion-off/reduced motion continues to remove decorative motion.

The existing official winner, finishing order and podium remain authoritative.
The new Podium action exits expanded viewing, ends a replay and focuses the
result, with a short staged entrance for the podium cards. Replay scrolls the
race back into view. No result is submitted or race command issued by either
action, and incomplete results cannot expose the Podium action.

## Verification and rollout

- `pnpm check`: 239 files / 1,987 tests, types, names, theme colors, release
  consistency and production build pass. The existing 1.452.0 bundle is retained
  unchanged; application/startup/Home counts remain 78/3/4.
- Path tests cover 2/12/32 racers, multiple seeds, 15/60/600-second durations,
  monotonic motion, official finish times, deterministic late arrival, duration
  scaling, visible spread/comebacks, factual calls and legacy compatibility.
- The real controller/renderer browser fixture passes 279 checks with zero
  browser errors: Light/Dark at 320/390/768px, landscape/fullscreen fallback,
  all-racer bounds at start/middle/finish and 2/12/32-player fields, live gear,
  keyboard focus, sound opt-in, reduced motion, pause/resume/reset, duration
  changes, late arrivals, replay, Podium, stale/unauthorized commands and cleanup.
- The isolated PostgreSQL fixture passes the canonical race/permission tests
  and new version-stamp checks. Only new guarded starts receive the marker;
  existing runs and paused duration edits retain their manifest.
- Ship the frontend first, then activate
  `20261020203316_stadium_race_presentation.sql`. It adds a private invoker
  trigger with an empty search path and no public execution grants; it does not
  update existing race rows or change the draw/finalization functions. Verify
  the deployed trigger with rolled-back temporary rows, without creating or
  changing a real race, and compare security advisors with the pre-change baseline.

Screenshots and machine-readable evidence are in `arena-drama/`. They use
isolated fixture racers and clocks, with no league writes. A transient uniform
preview assertion was corrected to wait for the actual settled header geometry
rather than sampling a 100ms animation frame; the full browser review passes.
Physical iOS/Android fullscreen, real-device frame pacing and audio quality,
live synchronization under load and comprehensive screen-reader speech remain
unverified.
