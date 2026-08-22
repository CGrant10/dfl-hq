# Quick Round design QA

- Source: `C:\Users\GUEST\Pictures\Codex Image Aug 22, 2026, 09_51_38 AM.png` and `C:\Users\GUEST\Pictures\Codex Image Aug 22, 2026, 09_51_47 AM.png`
- Implementation screenshots: `C:\Users\GUEST\Documents\Codex\2026-08-21\can\work\dfl-hq\qa\quick-round-play.png`, `C:\Users\GUEST\Documents\Codex\2026-08-21\can\work\dfl-hq\qa\quick-round-scorecard.png`, and `C:\Users\GUEST\Documents\Codex\2026-08-21\can\work\dfl-hq\qa\quick-round-gps.png`
- Comparison: `C:\Users\GUEST\Documents\Codex\2026-08-21\can\work\dfl-hq\qa\quick-round-comparison.png`
- Viewport: 355 × 768 CSS pixels; source images are 709 × 1536 physical pixels at approximately 2× density.
- State: Square Butte Creek Quick Round, Hole 1, one golfer, no entered scores. GPS permission denied in the test browser, so the badge correctly shows the official 145-yard maximum fallback.

## Full comparison

The implementation follows the reference hierarchy: hole navigation is centered in the header, official par and yardage sit directly beneath it, the circular GPS reading occupies the upper-right corner, and the current golfers form the primary content. The DFL dark theme, existing typography, and existing button treatment are intentional product-system adaptations. The reference bottom navigation was intentionally omitted at the user's request.

## Focused comparison

- GPS: live geolocation starts automatically. While a fix is unavailable, the badge shows the current hole's official maximum rather than a misleading live distance.
- Scoring: each golfer has a dedicated Add score control and an inline minus/current/plus stepper. Score updates still use the existing scorecard engine and database upsert path.
- Hole navigation: Previous and Next cycle the shared active hole and update par, official yardage, every player's entry target, the GPS target, and the scorecard highlight.
- Group scorecard: a separate horizontal scorecard view shows every golfer, every hole, total strokes, and to-par score.
- GPS map: satellite framing is capped to the selected hole. An off-course position is reported in the distance metadata but is excluded from map bounds, preventing the map from zooming out to a regional view. A player-to-green line is shown when the golfer is within the active hole's range.

## Findings and iteration history

1. Initial implementation left the event guest strip above the round. It was removed in focused Quick Round mode.
2. The first GPS badge used the full course name and wrapped too heavily. It now uses the concise course key (`CENTER`, `NEW SALEM`, or `ROLLA`).
3. The scorecard initially had two back controls. The redundant control was removed; the persistent header toggle now switches cleanly between scoring and scorecard.
4. The existing GPS fit included a user located miles away. The final fit logic uses the official hole yardage as its range cap and keeps the satellite view on the active hole.
5. Browser verification confirmed hole cycling, score stepping, scorecard switching, hidden app navigation, hole-specific GPS metadata, and no console errors.

## Final result

passed
