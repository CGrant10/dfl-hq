# Arena showdown and stadium depth — 1.442.0

Auto camera now gives separated-lane battles two dedicated close-ups. Phones
under 650px use side-by-side feeds so racers can occupy most of the field height;
wider screens use stacked lanes. Both feeds use the same horizontal world origin
and units per pixel. Jersey artwork, live rank, name and a numeric yard gap come
from the same shared frame. Slot order follows original lane identity and stays
stable when the actual leader changes. No path, draw, clock, result or sealed
place is changed or exposed early.

A battle/pass/photo/final shot qualifies when its first two racers are at least
three lanes apart and within three yards. An established pair can remain in view
until the gap exceeds five yards, preventing repeated cuts at the entry threshold.
The existing director still controls shot holds and observed passes. Countdown,
manual Field/Follow, completed results and reduced motion override showdown.
Manual Field clears close-up geometry before laying out the overview. Follow
returns through the existing camera glide. Auto entrances interpolate runner
positions and sizes; native-sized labels enter with a finite 240ms fade.

The existing stadium image supplies distant and near crowd tiers. Those tiers
move by at most 18px and 42px over a full camera traversal; the foreground
sideline moves by at most 74px. Movement follows the actual interpolated camera,
not a separate timer. Pausing freezes the race and scenery together. An explicit camera change while
paused can finish its existing 600ms view glide, then holds still. Reduced
motion uses a true full-field presentation with static stadium layers. The
changes introduce no artwork download, package, autoplay sound, independent
animation loop or database change. Arena remains a lazy route with the same
77-module application build and three-module startup path. Showdown metadata
uses renderer dimensions rather than reading layout on each DOM refresh.

The isolated browser fixture uses the production page/controller and seeded
shared race. Reviews cover 320/390/768px Light and Dark, actual member identities,
phone columns and wider stacked feeds, live numeric gaps, moving stadium-image
source positions, fullscreen/rotation, Field/Follow overrides, pixel-stable pause,
reduced motion, replay and exact official order. Source-position instrumentation
observes real Canvas draws; no production renderer test hook is installed.
Screenshots/results are retained in `/tmp/dfl-1442-arena-final/`.

Unit coverage checks immutable position/rank selection, stable identity through
passes, entry/exit thresholds, manual/reduced-motion overrides, phone/landscape
body bounds and bounded scenery offsets. Full release/type/name/theme/unit/build
checks and CI browser regressions run before merging. Physical iOS/Android,
GPU frame rates, haptics and screen-reader speech output remain unverified.
