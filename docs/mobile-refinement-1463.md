# Mobile broadcast and Sportsbook refinement — 1.463.0

League Spotlight's six-character score overflowed its fixed 100px column at 320px and ran into the headline. Number stories now give the headline a full row and the metric its own space. Weekly results use two aligned, complete team/score rows and open the exact archived matchup. Percentage stories retain their dial. The opener and dedicated award illustrations are preserved.

The Home score collapse previously rescanned and replaced all six moving elements after unrelated broadcast mutations, bubbled animation completions and changes to the page height. It now invalidates for matchup changes, relevant entrance completion, matchup dimensions and viewport width. Scroll updates keep the same six elements and cached endpoints. Current scores, names, viewport changes, motion preferences and teardown still update correctly.

Sportsbook's transformed entrance wrapper could temporarily make its fixed Review button sit below the board. The wrapper now leaves entrance motion to the route. The review bar has a dedicated 44px action, full-width horizontally scrolling picks and a separate Clear target. Its count and combined odds remain visible. Bet-slip rows give player names the available width, put the odds underneath and reserve 44px for removal. Review/confirmation and wager validation are unchanged.

## Verification

- `pnpm check`: release consistency, theme scan, typecheck, names, 2,020 tests / 246 files and generated builds. The preceding 1.462.0 bundle remains unchanged.
- Broadcast: 52 Light/Dark compositions at 320/390/768px, including League Spotlight, percentage stories, long award names and reduced motion. No text/metric overlap or horizontal overflow.
- Sportsbook: 18 Light/Dark cases at 320/390/430px using the production selection, reconciliation, review and confirmation handlers. Covers 1/2/6 picks, initial viewport position, navigation clearance, reachable final market, focus restoration, Clear and rebuilt button handlers. Review makes zero database calls; no wagers were placed.
- Scroll: Light/Dark at 320/390/430px, with unrelated broadcast mutations, animation events and page-height changes during a reversing flight. Moving elements remain connected; live score/name updates, resize and motion-off behavior remain covered.
- Existing sheet gesture regression also exercises dismissal, keyboard viewport constraints and focus restoration.

Actual mobile Light/Dark screenshots were inspected. Selected frames are in [mobile-refinement-1463](mobile-refinement-1463/). All new colors use shared theme tokens. Native iPhone frame pacing, physical keyboard behavior and screen-reader speech remain unverified; browser checks use deterministic fixtures without league writes.
