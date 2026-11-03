# Mobile trade, advice and broadcast polish — 1.536.0

Trade suggestions now distinguish useful roster depth from package padding. In
one-QB player pools, the strongest offered QB retains full value, the next earns
20% backup credit and further QBs add no package credit. Untagged other formats
are unchanged. Candidate search and detailed evidence use the same weights;
extra bench QBs cannot manufacture depth points. Incoming players immediately
cut by the recipient and large mostly surplus packages are rejected. Useful
packages up to eight players remain supported. Existing price thresholds and
QB Steal restrictions are unchanged. No offer category is fabricated.

Compact offer rows show both complete packages, position and required roster
drops for both sides. Price balance and evidence confidence remain distinct;
lower-confidence cards say Estimated balance. Existing inline player controls,
saved/passed offers, lineup comparisons and multi-team routing remain available.
Repeated lineup calculations are reused during package evaluation.

Analyzer headings, flat report sections and concise start/sit decisions now
follow the shared interface. Advice leads with the starter, retains legal slot
assignments, injury and late-backup conditions, and consolidates repeated
projection caveats in an optional disclosure. Home's matchup names have their
own full-width row below logos and scores. Search is unchanged.

Broadcast copy no longer silently slices text or clamps important headings.
The stable-height measurement includes the daily opener. Links carry the shown
matchup, owner, week, season, history moment, fact, player, trade target, event,
poll or announcement identity instead of opening a remembered generic tab.
Unavailable stories show an explicit unavailable state. Poll links expose even
closed polls directly. Historical owner links select that matchup when the
source has no game ID. Back retains the same Home edition without consuming
another daily story allowance; this does not guarantee the last active slide.

## Validation

- `pnpm check`: release versions, theme scan, types, names, 2,435 tests in 295
  files and the production build.
- Broadcast: 90 normal layouts and 56 enlarged layouts, both themes, at
  320/390/768px; swipe/replay, Reduced Motion and full text containment pass.
- Trade: 112 reading, compactness, lineup, multi-team, Back and motion checks.
- Shared interface: 24 layouts plus six enlarged layouts.
- Compiled real-league Home: ten slides in each theme, no overflow or page errors.
  Each of its nine linked cards opens the matching destination and returns to
  the same edition. The daily opener is informational.
- Compiled advice: eight width/theme/text-size cases, no overflow and passing
  measured text contrast. Five unavailable-story routes and one exact calendar
  event pass. No existing live poll was available for a compiled poll click;
  its destination mapping and closed-poll rendering were inspected in source.

Evidence: [layout metadata](mobile-trade-broadcast-polish-1536/broadcast-layouts.json),
[trade checks](mobile-trade-broadcast-polish-1536/trade-reading.json),
[destination checks](mobile-trade-broadcast-polish-1536/destination-checks.json),
[fallback checks](mobile-trade-broadcast-polish-1536/fallback-checks.json),
[advice checks](mobile-trade-broadcast-polish-1536/advice-checks.json).
Fixture screenshots are retained for [Light trades](mobile-trade-broadcast-polish-1536/offers-light.png),
[Dark trades](mobile-trade-broadcast-polish-1536/offers-dark.png),
[Light broadcast](mobile-trade-broadcast-polish-1536/broadcast-light.png) and
[Dark broadcast](mobile-trade-broadcast-polish-1536/broadcast-dark.png).
Actual member screenshots remain local. Browser checks use local Chromium;
physical iOS Safari, VoiceOver and on-device frame pacing are unmeasured.
