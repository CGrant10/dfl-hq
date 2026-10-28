# Trade reading and Sportsbook tickets — 1.506.0

Offer browsing now includes a compact starter comparison before opening the full
trade analysis. The Book uses quieter pick rows and a consistent ticket layout.

## Trade offers

- Complete send/receive packages remain visible in compact cards. Metrics have
  consistent columns, with the lineup-fit label beside the expandable comparison.
- “Lineup changes” calculates only when opened. It uses the existing optimized
  offensive lineup, roster cuts and explicit multi-team destinations. Changed
  slots show Before/After side by side for every team; unchanged starters, required
  drops and modeled waiver fills are identified without inventing improvements.
- Comparisons explicitly show rest-of-season starters, even when the search uses
  the next four weeks. Weekly deltas retain the evaluator's rounding.
- Native disclosures use the existing finite, reversible 260ms motion. Keyboard
  access, reduced motion, Motion off and cleanup follow the shared controller.
- Loading more offers updates the results rather than rebuilding the workbench.
  Expanded comparisons and the visible offer anchor survive. Full analysis returns
  to the source offer's saved viewport position and restores focus.
- Three-team cards group each sender with their outgoing players and named
  destinations. All transfers remain visible; there is no hidden “+ players” list.

The value model and Steal thresholds are unchanged. Existing regression tests
confirm that materially better lineup fit, price and evidence rank ahead of
package variety or additional players. Presentation does not manufacture Steals.

## Sportsbook

- The slip uses a ruled list rather than a stack of filled boxes. One content
  area scrolls; the header, current stake, estimated return and review/confirmation
  action remain available. Remove controls retain 44px touch targets.
- Editing the stake updates amounts without replacing the pick rows. Account
  balance changes invalidate an obsolete confirmation and recompute the amounts.
- Tickets show entry size and combined odds once, full pick/market details, clear
  hit/miss marks and aligned Stake/Return figures. Actions occupy their own row.
  Official and provisional outcomes retain their existing distinction and colors.
- New colors use existing theme tokens. Typography scales with the root font size.

## Validation

- `pnpm check`: 2,354 tests / 285 files, release checks, themes, typecheck, names and
  production build. Bundle remains 90 modules, three startup / four Home.
- Trade reading browser review: 100 checks at 320/390/768px in Light/Dark, covering
  lazy real comparisons, starter upgrades, explicit three-team routes, rapid
  reversal, keyboard input, more-results continuity, exact analysis return,
  enlarged text, Keep controls, reduced motion, Motion off and overflow.
- Existing Trade journey and connected portrait review pass, retaining routing,
  fresh ownership/injury checks, saved comparisons, sharing and focus restoration.
- Slip review covers 18 one/two/six-pick layouts at 320/390/430px in both defaults,
  pinned matching totals, stake edits without list replacement, balance changes,
  confirmation safety, native scrolling, reopening and focus return.
- Existing result review verifies live hit/miss/push, pending grading, official
  results, refresh failures and shared cards. Shared sheet review covers dragging,
  keyboard viewport changes and dismissal.

Browser fixtures use production renderers and handlers with backend writes blocked.
No production trade, wager, notification or member record was created. Physical
phone frame timing and screen-reader announcements were not measured here.

## Inspected mobile screenshots

- [Offers — Light](trade-book-polish-1506/offers-light.png) · [Dark](trade-book-polish-1506/offers-dark.png)
- [Starter comparison — Light](trade-book-polish-1506/upgrade-light.png) · [Dark](trade-book-polish-1506/upgrade-dark.png)
- [Three-team routing — Light](trade-book-polish-1506/three-team-light.png) · [Dark](trade-book-polish-1506/three-team-dark.png)
- [Bet slip — Light](trade-book-polish-1506/slip-light.png) · [Dark](trade-book-polish-1506/slip-dark.png)
- [Tickets — Light](trade-book-polish-1506/tickets-light.png) · [Dark](trade-book-polish-1506/tickets-dark.png)
