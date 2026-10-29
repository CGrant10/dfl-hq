# Home compact scoreboard finish — 1.515.0

The named compact scoreboard now sits flush beneath the header as one coherent
surface. The large rounded card border is replaced by a fine lower edge, warm
near-black/cream ground and the shared theme shadow. A short accent mark and
quiet return chevron frame the existing week/status caption.

## Visual treatment

- Chosen team photos and initials use consistent 32px rounded frames. Full team
  names retain their space; score digits align on the shared grid. The compact
  scores are slightly smaller and use the app's boxy Rajdhani face. The expanded
  Home totals use the same face/weight so the existing flight never swaps fonts.
- The known higher actual score takes the theme accent. Ties, unknown totals and
  forecasts stay neutral; a projected score is still explicitly labeled. This
  is a visual comparison of observed totals, not a predicted winner or verdict.
- Enlarged root text switches to two clear team rows instead of breaking every
  word inside narrow columns. Dock-height changes refresh the cached destination
  geometry and scroll offset. Neither document height nor native scroll changes.
- Source/flight/dock timing, complete names, source-photo preference, true score
  precision, click/focus return, reduced motion and Motion off are retained.
  Colors, borders, shadow and surface ink use shared Medicine Wheel tokens.
- This pass changes the Home score surface and its matching total typography.
  Broadcast slide markup/design, Clubhouse, trade values and league data are
  unchanged. No new font, image, dependency, request or idle animation loop.

## Validation

- `pnpm check`: 2,403 tests / 291 files; release, themes, typecheck, names and
  production build pass. Final 12 focused motion tests and theme/type/name/build
  checks also pass after the font-aware layout refinement.
- 57 new browser checks cover Light/Dark at 320/390/768px: text contrast, full
  names, aligned scores, known leaders, changed scores, zero ties, unknown totals,
  forecast labeling/neutrality, 200% root text and the original matchup return.
- Existing native/fallback scoreboard review passes 18 cases, including forward
  and reverse handoffs, viewport toolbar resizing, exact phase labels, 4× CPU
  native touch scrolling, score/name updates, modal covering, motion preferences
  and cleanup. The shared scroll review passes 72 checks.
- Built-app checks use real league data read-only in both themes. The selected
  local profile's Week 8 forecasts remain 108.6 / 114.6 in the source and dock,
  labeled Projected, with neutral score ink and exact return to the matchup.
  All external mutation requests are blocked in those checks; the profile choice
  is local to the isolated browser. Surface fixtures use representative photos
  and isolated scores; they do not claim to be live league totals.
- Production remains 90 modules, three startup/four Home, and 57 shared styles
  in one request. Physical phone frame pacing and screen-reader speech remain
  unmeasured. No production profile, trade, wager or notification was edited.

## Inspected screenshots

- [Light surface](scoreboard-finish-1515/light-dock.png) · [Dark surface](scoreboard-finish-1515/dark-dock.png)
- [200% Light text](scoreboard-finish-1515/light-large-text.png) · [Dark enlarged text](scoreboard-finish-1515/dark-large-text.png)
- [Actual projected matchup](scoreboard-finish-1515/light-real-forecast.png) · [Dark forecast](scoreboard-finish-1515/dark-real-forecast.png)
- [New surface in context](scoreboard-finish-1515/dark-context.png) · [Prior visual baseline](scoreboard-finish-1515/before-dark-context.png)
