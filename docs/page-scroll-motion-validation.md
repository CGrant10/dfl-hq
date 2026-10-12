# Page scrolling motion — 1.379.0

Home, Clubhouse, Sportsbook, Trades, Team Analyzer, History, Profile, Wall and
DFL Lore gain a compact context bar when their full header leaves the screen.
Home waits until the broadcast has scrolled away. The original header keeps its
layout space. The compact bar enters smoothly and gives a keyboard-accessible
way back to the header. It follows the current section instead of copying
unrelated statistics.

Sportsbook mirrors the existing bankroll. Clubhouse mirrors the selected
matchup's actual score strip after its full team panel scrolls away, including
complete team names and the source phase. Hidden or unselected matchups do not
appear. Scores update from the existing DOM/model rather than a second poller
or interpolated numbers. Existing GameDay scoreboard behavior is retained.

Offscreen section headings rise 10px on their first scroll entrance. Already
visible headings and async live updates do not receive another entrance. Motion
starts with the existing app preference and honors Motion off and reduced
motion; the compact reference remains usable without animation. Scroll geometry
is read together in one scheduled frame, with no timers or new network polls.
Observers, animations, temporary focus attributes and decorative nodes are
released on route teardown and reattached safely after renderer replacements.

## Validation

Actual-data browser checks cover nine routes at 320px, 390px and 1024px, including
compact bar position below mobile/desktop chrome, horizontal overflow, and
selected Clubhouse score/name parity. Screenshots capture both phone widths.
A separate production-controller browser fixture covers document-space
preservation, first-entrance-only headings, keyboard focus, preference changes,
reduced motion, actual-digit score updates, hidden matchups, 200% root text at
320px, renderer replacement, frame coalescing, and controller disposal.

Unit coverage checks the collapse dead zone and real chrome/safe-area boundary.
Full unit, name, type and build gates run before release, including deterministic
shared CSS regeneration and offline precaching of the new controller. Browser
checks block league writes.

## Refinements — 1.381.0

The compact reference now reverses an interrupted entrance/exit from its actual
opacity and position. It no longer resets to an invisible or fully visible
frame when the reader changes direction. Section captions glide 4px into place
in the direction of scrolling, with an 8px dead zone that prevents label chatter
near heading boundaries. A fixed tracking boundary prevents caption wrapping or
the scoreboard's changing height from switching section labels by themselves.
The thin reading-progress line settles over 100ms instead of stepping directly.

When a Clubhouse reader passes the full matchup panel, the already-visible
compact reference expands into its score row over 240ms. Scrolling back contracts
it from its current height, including during an interrupted transition. The
bar returns to natural height on completion; document space remains unchanged.
Score-row entrances fade/lift subtly, while score digits always mirror the
actual source. Refreshes do not replay the caption, bar or score-row motion.
A source change cancels an obsolete resize rather than clipping new content
inside a stale animated height. Motion off and reduced motion cancel the added
effects and progress transition while retaining the reference and scores.

Geometry reads still share the existing scheduled frame. A natural-height
measurement happens only when a scroll changes the compact context's layout;
there is no new timer, perpetual animation loop, poller or data request. All new
animations are canceled on preference changes and route teardown. The existing
GameDay scoreboard uses its original controller.

Read-only actual-data review again covers all nine routes at 320/390/1024px,
checking chrome alignment, complete selected team names, actual score parity,
bankroll context and horizontal overflow. The original controller lifecycle
suite covers focus, large text, reduced motion, hidden details, renderer
replacement, source changes and teardown. A separate 25-check browser review
covers interrupted frame continuity, caption hysteresis, genuine intermediate
scoreboard heights, document-position stability, reversing mid-expansion,
source-update suppression and preference changes. Artifacts are recorded in
`/workspace/dfl-scroll-1381/`.

The refinements passed 1,559 tests across 182 files, type checking, unresolved
name checks and the production build. Both 23 original lifecycle checks and 25
new motion/performance checks passed. A settled context performs zero idle
geometry reads, and a burst of 100 scroll events still shares a scheduled paint.
All 27 actual-route width checks passed without runtime errors or overflow.
