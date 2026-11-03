# Clubhouse matchup strip — 1.534.0

The matchup dropdown and folded duplicate league-score drawer are replaced by a
visible horizontal strip. Each tile pairs both team pictures, names and scores.
The active matchup uses the existing theme surface and accent underline. Tapping
a tile or swiping the main matchup updates the same route, lineups, clips and
stats; the active tile scrolls into view without moving the page vertically.
The strip itself uses native horizontal scrolling. Arrow keys, Home and End
support keyboard selection, with full names and scores in accessible labels.

On arrival, visible team marks perform one 280ms transform-only shake. Names,
scores and layout stay still. It does not run on score refresh; Reduced Motion,
global motion-off and the Clubhouse motion control suppress it. Interrupted
swipes and route cleanup cancel temporary transitions and observers. No additional
polling, data request or continuous animation is introduced.

## Validation

- `pnpm check`: 2,424 tests in 293 files, release markers, themes, types, names and
  production build pass. The final build retains 90 application modules.
- 124 real-touch checks cover six matchups at 320/390px in Light/Dark, finger
  tracking, forward/reverse/edge/cancelled gestures, route identity, native
  vertical scrolling, active-tile reveal, tap/keyboard selection, interrupted
  arrivals, logo landing motion and Reduced Motion. No page errors or writes.
- All 297 existing Clubhouse checks and 320 layout checks pass across five
  widths, both themes and four text/spacing settings, including 200% text.
- Read-only compiled-app checks cover six actual league matchups, forward/back
  touch navigation, both themes at 320/390px, no horizontal page overflow and
  removal of temporary transition layers. Real member screenshots stay local.
- Fixture screenshots were inspected in both themes, including narrow-screen
  and enlarged-text layouts. Colors use the existing Medicine Wheel tokens.

[Touch checks](clubhouse-matchup-strip-1534/swipe-checks.json) ·
[Compiled checks](clubhouse-matchup-strip-1534/compiled-checks.json) ·
[Light](clubhouse-matchup-strip-1534/390-light-clubhouse-default.png) ·
[Dark](clubhouse-matchup-strip-1534/390-dark-clubhouse-default.png)

Physical iOS Safari and VoiceOver remain unmeasured. Browser evidence uses
Chromium touch emulation; exact ESPN assets or animations are not reproduced.
