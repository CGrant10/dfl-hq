# Mobile recap and comparison motion — 1.469.0

GameDay → Moments → Play recap now presents saved lead changes as two team
identities with their recorded scores. Player highlights have larger bounded
portraits, a prominent score or scoring swing, and short banter. A surge's
before/after totals are derived only from its saved points and delta. Current
live scores never replace a historical observation. Old records without those
fields retain their original text. Lead records must belong to the selected
matchup and actually put the named team ahead.

The reel uses the shared finger-following swipe controller, with direct progress
controls, Back/Next and optional playback. Swiping or scrolling pauses playback;
backgrounding pauses it too. The shared sheet entrance, drag dismissal, viewport
fit and exit keep controls available on short phones. Interrupting a swipe with a
button releases previews before the new transition. The shared swipe controller
now checks for an actual neighbor before asking a custom panel resolver for it.

Player comparison openings reuse the Clubhouse's portrait-first controller. The
photo moves before the sheet appears, then remains stationary while the sheet
expands. Loading starts concurrently, and details render after the sequence so
late data cannot move the photo again. Selection within an existing comparison,
return travel, focus, refresh and retry remain available. Native close events
from an older opening cannot cancel a fresh comparison or its viewport fit.

## Validation

- `pnpm check`: 2,047 tests in 248 files, release/theme/type/name checks and
  production build passed. Final type/name/theme/build checks repeated after
  motion cleanup. Application bundle remains 79 modules, with 3 startup and 4
  Home modules.
- Production recap controller and saved-moment model: 64 browser checks with
  actual loaded local image fixtures. Light/Dark at 320/390px, plus a 320×480
  short viewport, comfortable text, long names, failed images and nine-frame
  progress targets. Checks include frame/portrait bounds, contrast, real scores,
  forward/reverse/edge swipes, interrupted settling, native vertical scrolling,
  header drag, focus return, playback/pause, backgrounding, reduced motion,
  motion-off and teardown. No browser errors or backend writes.
- Existing comparison suite plus photo-first cases: 64 checks, covering a held
  first request, cached openings, picture-before-panel ordering, stationary
  pictures through expansion, no second flight, quick reopen and early closing.
- Existing Clubhouse portrait-first browser suite passed unchanged.

Inspected actual captures of the [Light lead frame](mobile-recap-1469/light-320-lead.png),
[Light player frame](mobile-recap-1469/light-320-surge.png),
[Dark lead frame](mobile-recap-1469/dark-390-lead.png),
[Dark player frame](mobile-recap-1469/dark-390-surge.png),
[short phone](mobile-recap-1469/dark-320-short.png) and
[large-text photo fallback](mobile-recap-1469/dark-320-comfortable-fallback.png).
[Recap checks](mobile-recap-1469/checks.json) are retained with the captures.
Comparison captures show [photo-first entry in Light](mobile-recap-1469/comparison-light-390-photo-first.png)
and the panel expanding in [Light](mobile-recap-1469/comparison-light-390-panel-expand.png)
and [Dark](mobile-recap-1469/comparison-dark-390-panel-expand.png).
Real iPhone/Safari frame pacing, low-power mode and high-refresh hardware remain
unverified. No database, notification, scoring or trade valuation changes.
