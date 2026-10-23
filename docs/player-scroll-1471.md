# 1.471.0 — Player-card position and scrolling score effects

Player cards now reset both the outer dialog and the stats scrollport after
`showModal`, before the connected portrait measures its destination. Resetting a
hidden scroll container can be ignored by the browser. A cached card therefore
could reopen deep in the previous stats, with its portrait outside the visible
scrollport. The existing photo-first entrance, cached preview, late loading,
focus return and data refresh behavior are retained. The reset belongs to opening
the card; it does not run on live score updates while someone is reading.

The shared GPU renderer previously listened only to scroll events on its own
root. Inner stats scrolling does not bubble, so the old fire/ice geometry could
keep drawing after the score moved. Document scrolling and Home's independently
faded scoreboard source could also leave effects detached from their text.

The renderer now captures relevant nested, ancestor and document scrolling,
immediately clears the whole surface and hides it while movement is active.
After 240 ms of quiet, including the sticky scoreboard's 220 ms compact
transition, it measures the settled scores and redraws. The actual DOM scores
remain visible throughout. Unrelated scrollports do not pause it. Effects clip
to every enclosing scrollport and follow ancestor opacity, preventing paint over
the stationary player-card header or a second silhouette during Home's handoff.
The canvas is made visible only after a fresh frame. Cleanup cancels the pending
restart and removes the capture listeners.

This preserves one GPU surface per root and cached glyph masks. There are no
layout reads or texture uploads in the animation loop and no layout measurement
on scroll events. Scrolling does not regenerate unchanged glyph textures.
Hot/cold thresholds and semantic colors are unchanged.

## Validation

- `pnpm check`: 2,062 tests in 250 files; release, theme, type, name and production
  build checks passed. Bundle remains 79 modules, 3 startup and 4 Home modules.
- 32 real player-card browser checks cover held data, cached deep-stat reopens,
  reset before the photo arrives and after refreshed content, portrait-first
  sequencing, stationary photos during expansion, rapid reopening, early
  dismissal, resize, motion-off and reduced motion. Light/Dark at 320/390px.
- 64 GPU browser checks use the production renderer/shaders at 2× phone density
  in Light/Dark at 320/390px. Both hot and cold scores paint nonempty pixels,
  immediately clear during inner scrolling, reuse glyph textures, respect the
  header clipping boundary and leave no ghost when fully clipped. Actual WebGL
  scissor state and readback pixels are checked. The production Watch collapse
  controller realigns effects after both compact and expanded transitions.
  Document scrolling, unrelated scrollers, hidden/partial-opacity ancestors,
  motion preferences and teardown are also covered. No browser errors.

Inspected actual [Light player card](player-scroll-1471/portrait-open-light-320.png),
[Dark player card](player-scroll-1471/portrait-open-dark-390.png),
[hot clipping](player-scroll-1471/dark-390-hot-clipped.png),
[cold clipping](player-scroll-1471/light-320-cold-clipped.png),
[resting fire](player-scroll-1471/light-320-hot-rest.png),
[resting ice](player-scroll-1471/dark-390-cold-rest.png), and Watch captures in
[Light](player-scroll-1471/light-390-watch-expanded.png) and
[Dark](player-scroll-1471/dark-320-watch-expanded.png).
[GPU checks](player-scroll-1471/checks.json) and
[player-card checks](player-scroll-1471/player-card-motion-checks.json) accompany
the captures. GPU-only captures use isolated score surfaces; player-card captures
use the actual shared controller with a loaded local photo fixture.

Real iPhone/Safari compositor behavior, low-power mode and high-refresh hardware
remain unverified. No database, trade valuation, notification or scoring changes.
