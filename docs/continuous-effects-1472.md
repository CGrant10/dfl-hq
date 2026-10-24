# 1.472.0 — Continuous score effects and portrait-first arrival

Fire and ice now remain visible during scrolling in player cards, GameDay Watch
and Clubhouse. The previous release hid the shared canvas until scrolling
settled, which prevented stale paint but visibly interrupted the effects.

Relevant scroll events now coalesce geometry updates into one animation frame.
The canvas keeps its size and visibility; updated coordinates, clipping and
opacity are drawn before that browser paint. Existing glyph textures remain
cached. While the sticky Watch scoreboard changes font size, its masks scale
with the actual digit rectangles instead of regenerating textures every frame.
After the compact transition settles, the normal font mask is refreshed once.
Unmoving screens return to the existing 30 fps effect loop. Clipped or hidden
scores still stop painting, and unrelated scrollports do not interrupt effects.

The shared portrait-first opening retains its original sequence: the photo
travels first, then stays stationary while the panel opens. A bounded 8 px arc
and 320 ms eased landing give the portrait a stronger entrance. The panel now
reveals over 280 ms with a softer deceleration, and player headers receive one
brief theme-accent border trace. Cached reopens still reset to the top. Reduced
motion, motion-off, early dismissal, focus return and quick reopening remain
supported; the return animation is unchanged.

## Validation

- `pnpm check`: 2,062 tests in 250 files, theme/type/name/release checks and
  production builds passed. Bundle remains 79 modules, 3 startup and 4 Home.
- 81 real GPU browser checks in Light/Dark at 320/390px and 2× density cover
  nonempty paint, continuous nested/document scrolling, 14 forward/reverse moving
  frames per hot/cold case, exact alignment, unchanged glyph upload counts,
  clipping, source opacity and cleanup. The production Watch collapse controller
  is checked during and after compact/expanded transitions.
- 36 production player-card checks cover the portrait arc, photo-before-panel
  ordering, stationary photo through reveal, themed header trace, loaded/cached
  states, default scroll position, interruptions and motion preferences.
- The existing broader mobile sheet regression passed, including the unchanged
  portrait return, drag dismissal, live refresh and recovery paths.

Actual reviewed captures and browser results are retained in
[continuous-effects-1472](continuous-effects-1472/). GPU captures use isolated
score surfaces with production rendering; card captures use the actual shared
controller with a loaded local photo fixture. No palette, scoring, notification
or database changes. Physical iPhone/Safari compositor pacing, low-power mode and
high-refresh hardware remain unverified.
