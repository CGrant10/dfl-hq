# Power Rankings and team identity — 1.512.0

Power Rankings now separates the team's destination from its ranking snapshot.
The team name/photo opens that roster's Clubhouse matchup. The rating and chevron
open a compact inline snapshot; Full report keeps the existing detailed sheet.

## Reading and motion

- Full current names have more room. Record and movement share a quiet metadata
  line, while ratings align on the right. The chosen Sleeper/DFL photo remains;
  missing or failed images fall through to the existing initials fallback.
- One inline snapshot opens at a time. It shows recent weekly fantasy points,
  scoring rank, lineup rank where all projections are known, all-play results and
  the edition's banter. Facts come from the viewed edition, including frozen
  published forecasts; current rosters cannot rewrite an old snapshot.
- Snapshot tracks expand intrinsically over 260ms and reverse from their current
  height. Closing makes controls inert immediately and returns focus when needed.
  Week changes recreate the correct snapshot, and collapsing View all closes any
  hidden team's snapshot. No retained height, delayed reopen or animation loop.
- Rank motion is limited to actual known rank changes and runs once per edition.
  Navigation between weeks retains its short transition. Reduced motion and
  Motion off disable the disclosures' transitions and ranking effects.
- Enlarged text reflows the team identity, rating and recent-score cells. It does
  not shrink names to fit. Primary destinations and disclosure/report controls
  retain at least 44px targets.

## Mascot removal

Removed generated team illustrations from matchup introductions, final receipts
and profile cards. The atlas, rendering module, decorative stylesheet and offline
cache entries are removed too. This removes the 540,904-byte atlas from new
clients' downloads. Existing member-photo preference, DFL branding, broadcast
award artwork and customizable Arena racers retain their existing behavior.
No member profile or preference was edited.

## Validation

- `pnpm check`: 2,387 tests in 289 files, release consistency, themes, typecheck,
  names and production build. Final relevant 22 unit tests and theme/type/name/
  build checks also pass. The ranking formula and published editions are unchanged.
- 24 Power Rankings browser cases cover Light/Dark at 320/390/768px, full names,
  correct Clubhouse roster links, disclosure interruption/reversal, one-open-row
  behavior, focus, source-photo failures, week boundaries, 200% text, exact sheet
  return, connected portrait reversal, teardown and motion preferences.
- 63 record/identity browser checks cover Light/Dark matchup entrances, final
  receipts and profiles at 320/390px. Chosen photos remain, generated mascots are
  absent and no atlas is requested. Record targets, genuine fresh crossings,
  correction/stale/covered updates and Clubhouse integration continue to pass.
- 21 final-result checks cover clutch wins, blowouts, ties, real score digits,
  exact existing share payloads, explicit replay, motion preferences and teardown.
- Production remains 90 modules, three startup/four Home. The 56 shared styles
  ship in one request. No new dependency, backend endpoint or animation loop.
- Browser checks use isolated fixtures and block database writes. Physical-phone
  frame timing and screen-reader announcements were not measured.

## Inspected screenshots

- [Light rankings](power-rankings-1512/power-light-390.png) · [Dark](power-rankings-1512/power-dark-390.png)
- [320px snapshot](power-rankings-1512/power-snapshot-light-320.png) · [Dark snapshot](power-rankings-1512/power-snapshot-dark-390.png)
- [200% system text](power-rankings-1512/power-large-text-light-320.png)
- [Matchup entrance](power-rankings-1512/light-320-entrance.png) · [Final receipt](power-rankings-1512/dark-390-final.png) · [Profile](power-rankings-1512/dark-320-profile.png)
