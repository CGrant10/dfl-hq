# Compare Players — 1.508.0

The comparison sheet uses two aligned player columns, larger primary values and
compact supporting rows. Weekly scores and rest-of-season trade values stay in
separate tabs. Repeated owner, kickoff and sample rows have been consolidated;
recent game scores expand below the main comparison using the shared native
260ms disclosure motion.

## Reading and continuity

- A native Game week selector uses only the recent weeks already loaded. Past
  weeks show actual league-scored box scores, never today's projection or schedule.
  Opening from a selected player-card game preserves that week when it belongs to
  the comparison's current season. Archived seasons cannot leak into current data.
- Projection and average gaps start at 0.5 points; DFL value gaps start at 2 points.
  Displayed ties, different positions, missing numbers and stale projections do
  not get a misleading edge. Current unavailable players do not receive a
  projection or trade-value edge. The analyzer's valuation model is unchanged.
- A recent average requires at least two completed games. Each side names its
  actual sample size. Partial current games, stale rows, DNPs and wrong-season
  rows stay out. Expanded scores align by week; actual zeroes remain zeroes.
- Change player has Cancel and Escape recovery. Replacing or cancelling keeps the
  selected tab, week and expanded log. Reading position is preserved subject to
  the replacement content's scroll bounds. A fresh opening resets to defaults,
  or the selected same-season source game.
- Existing portrait-first entrance, connected return, sheet gestures, keyboard
  navigation, refresh/retry and motion preferences remain in place. No scroll
  animation loop or data request was added.

## Validation

- `pnpm check`: 2,366 tests / 287 files, release markers, themes, typecheck,
  unresolved-name check and production build. Bundle remains 90 modules,
  three startup / four Home; 54 shared styles are delivered in one request.
- 77 browser checks on the production comparison controller in Light/Dark at
  320/390px, including text contrast, aligned columns, 200% root text, actual
  historical scoring, unknown values, cancellation, replacement, refreshed
  owners, source-week inheritance, keyboard input, real sheet drags, keyboard
  viewport bounds, portrait-first motion, early close and cancelled requests.
- Motion off and reduced motion preserve immediate usable controls. Tests block
  backend writes; fixture portraits are stand-ins. No production member, trade,
  wager or notification was created.

Physical phone frame pacing and screen-reader behavior remain unmeasured.

## Inspected screenshots

- [390px Light](player-comparison-polish-1508/light-390-week.png) · [Dark](player-comparison-polish-1508/dark-390-week.png)
- [320px Light](player-comparison-polish-1508/light-320-week.png) · [Dark](player-comparison-polish-1508/dark-320-week.png)
- [Trade Light](player-comparison-polish-1508/light-320-trade.png) · [Dark](player-comparison-polish-1508/dark-320-trade.png)
- [200% text Light](player-comparison-polish-1508/light-320-large-text.png) · [Dark](player-comparison-polish-1508/dark-320-large-text.png)
