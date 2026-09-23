# Trade Board design QA

- Source visual truth: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\trade-mocks\option-3.png`
- Implementation capture: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\trade-mocks\trade-board-live.png`
- Combined comparison: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\trade-mocks\trade-board-compare.png`
- Viewport: 390 x 844 CSS px, device scale factor 1
- Source pixels: 390 x 844
- Implementation pixels: 390 x 844
- State: Trade route, Martin77 selected, 2-for-1 shape, Press intent, populated Steal attempts tier expanded

**Full-view comparison evidence**

- The implementation preserves the selected target-first hierarchy: title, target controls, five package shapes, Fair/Aggressive/Steal disclosures, intent selector, offer regeneration, and the fixed app navigation.
- The production header and navigation are the real app components rather than mock replacements. The implementation uses the selected member's live light team palette; the source mock used the default dark palette. This is expected theme behavior, not design drift.
- The added compact `Trading as` selector is an intentional production requirement for commissioner/team previewing. It replaces the old full page header, team toolbar, and roster summary, so the Trade Board remains the first page task.
- The first visual pass retained those three legacy blocks and pushed the board below the fold (P1). They were consolidated into the board header. A second pass made each offer too tall by moving Analyze to its own row (P2). The action is now an icon-sized fourth column and multiple offers scan naturally without horizontal overflow.

**Focused region comparison evidence**

- Target and shape controls: same order, rounded bordered surfaces, condensed Rajdhani hierarchy, green selected state, and five equal-width shape buttons.
- Tier headers: same three semantic groups, count display, short explanatory copy, independent disclosure behavior, and a populated tier opens automatically so the page never presents a blank default state.
- Offer rows: unequal packages remain visibly side-by-side, the package shape and value edge stay above the players, and the Analyze control loads the exact package into the preserved manual analyzer.

**Required fidelity surfaces**

- Fonts and typography: existing Rajdhani 600/700 assets are used; hierarchy, casing, wrapping, and compact labels match the app and source.
- Spacing and layout rhythm: 12px mobile gutters, compact control heights, 7-9px section gaps, and existing card radii/tokens are used. No horizontal overflow at 390px.
- Colors and visual tokens: all surfaces and semantic states use the current member theme tokens. No hard-coded blue copy or red card gradients were introduced.
- Image quality and asset fidelity: no generated player photos, fake team logos, placeholder imagery, or new raster assets are used. The real app seal, top bar, and navigation remain intact.
- Copy and content: the source labels are preserved where useful. Live offers use real Sleeper player/team data and honest `Fair shot`, `Worth a text`, and `Long shot` language.

**Interaction and runtime evidence**

- All, 1-for-1, 2-for-1, 1-for-2, and 2-for-2 filters returned offers with the live synced league data (12, 9, 12, 12, and 12 in the captured pass).
- Selecting a generated offer opened the custom analyzer and loaded a non-idle evaluated ticket.
- Target disclosure, tier disclosures, intent controls, pagination/regeneration, and team selection were exercised in the browser.
- Browser console errors: none.
- Repository checks: typecheck, name check, 842 tests, and production build passed.

**Findings**

- No actionable P0, P1, or P2 findings remain.

**Follow-up polish**

- P3: A future pass could hide zero-count tiers behind an `Other ranges` disclosure, but leaving them visible makes the three negotiation bands predictable and avoids changing the selected structure.

**Comparison history**

1. P1: legacy page header, team toolbar, and roster lead block pushed the selected Trade Board below the first viewport. Fixed by consolidating team selection into the board and making Trade Board the page heading.
2. P2: mobile Analyze action wrapped beneath every offer and made rows materially taller than the source. Fixed by retaining the four-column row and reducing the mobile action to the existing chevron icon.
3. Post-fix evidence: 390 x 844 capture shows the target, all package filters, all three tiers, and the start of multiple live offers above the fixed navigation with no horizontal overflow.

final result: passed
