# Outside-heading layout QA

## Evidence

- Viewport: 390 x 844 CSS pixels at device scale factor 1.
- Reference pages: `light-profile.png` and `light-facts.png`.
- Updated pages: `light-finances.png`, `light-trade.png`, `light-analyzer.png`, `dark-finances.png`, `dark-trade.png`, and `dark-analyzer.png`.
- Screenshot folder: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots`.
- State: authenticated member Martin77 with synced league, roster, fee, and trade data.
- Browser capture errors: none.

## Audit steps

1. **Fees structure — healthy.** League buy-in, Fees summary, Dues, Prize structure, Side competitions, Expenses, and Notes now render their label/count and red rail above the card. Cards contain only their data or empty state.
2. **Trade Board setup — healthy.** Build the package and its explanatory copy sit above one consolidated workbench card. Team selectors, anchors, package size, split, and intent remain functional and are not fragmented into extra cards.
3. **Trade Board results — healthy.** Generated offers and its explanatory copy sit above one result card. Fair, Aggressive, and Steal groups remain collapsed by default and retain their existing interaction.
4. **Manual trade builder — healthy.** The collapsible title and red rail sit outside its body card; the maximum-player hint and chevron remain readable and tappable.
5. **Team Analyzer selector — healthy.** Read a roster, team count, and explanatory copy sit above the selector card.
6. **Team Analyzer report — healthy.** Team report, Season outlook, and each collapsible evidence heading use the outside label/rail pattern. Expanded content sits in its own card rather than sharing one giant report container.
7. **Themes and responsive layout — healthy.** Light and dark captures preserve DFL-red rails, readable subtext, 16px page gutters, fixed navigation, and no horizontal overflow at 390px.

## Findings

- The previous pass incorrectly put red rails inside card titles. That styling has been removed globally.
- The corrected design uses one consistent order: section label and optional count, red rail, explanatory copy, then card.
- Home, Golf, Profile, and Facts remain unchanged.
- Screenshot review cannot prove screen-reader announcements; existing semantic headings, details/summary controls, selects, and buttons remain in place for automated and interaction testing.

## Implementation checklist

- [x] Move Fees labels and rails outside cards.
- [x] Apply the same outside-heading pattern to both trade pages.
- [x] Preserve the Trade Board's low-card-count layout.
- [x] Preserve collapsible offer groups and analyzer report sections.
- [x] Verify light and dark phone layouts.
- [x] Run the complete automated suite and production build.

final result: passed
