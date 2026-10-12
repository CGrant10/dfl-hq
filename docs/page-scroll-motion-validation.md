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
