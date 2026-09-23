# Trade page design QA

## Evidence

- Source visual truth: `C:\Users\GUEST\.codex\generated_images\01a05a88-a21b-7f51-8231-82aa8376e4e7\exec-a0c2383f-25c9-4252-b63d-f9dd8d5c56b5.png`
- Browser-rendered implementation: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\trade-mocks\trade-board-full-live.png`
- Combined comparison: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\trade-mocks\design-qa-comparison.png`
- Actual fixed-navigation viewport: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-trade.png`
- CSS viewport: 390 x 844 at device scale factor 1.
- Source pixels: 724 x 2172. Implementation full-page pixels: 390 x 1365. The combined comparison normalizes both to 364 CSS px wide; heights remain proportional.
- State: Light theme, Da Nickers trading with DaGrapeApes, Bijan Robinson required, package maximum 4, all offer tiers collapsed, manual mode collapsed.
- Console/runtime errors checked during capture: none.
- Primary interactions checked: package slider changes to 8, offer batch refresh indicator, Fair/Press/Swing highlight motion, tier expansion, generated-offer loading, manual builder lazy opening, and the eight-player cap.

## Full-view comparison

The implementation matches the selected Flat Rules direction: one white reading surface, clear horizontal section rules, outlined form controls only where the user can interact, flat collapsed offer rows, and a rule-separated manual mode. The persistent navigation is fixed to the bottom in the real 390 x 844 viewport. Its mid-page position in the full-page capture is a Chrome `captureBeyondViewport` artifact, not the rendered viewport position.

The pressure selector remains visible although the generated mock omitted it. That is an intentional product constraint: it preserves the existing Fair/Press/Swing behavior and the sliding selection motion the user explicitly requested.

## Required fidelity surfaces

- Fonts and typography: existing DFL display/body system is preserved; hierarchy, optical weight, wrapping, and small-label spacing track the mock closely.
- Spacing and layout: major section rhythm and hairline separation match. The live page is slightly taller because it retains the functional pressure selector.
- Colors and tokens: the page uses active palette tokens only. Light, Dark, Fairway, Medicine Wheel, and Medicine Wheel Light captures show no hardcoded page-surface leakage.
- Image quality and assets: existing crest and interface icons are reused at native quality. The mock introduced no new product imagery that required replacement.
- Copy and content: live labels, team names, package controls, offer counts, and manual-builder copy remain intact.

## Focused-region comparison

A separate crop was not needed: both columns in `design-qa-comparison.png` keep controls and labels readable at 364 CSS px. The actual fixed-navigation placement was verified separately in `light-trade.png`.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: the implementation is taller than the mock because the retained pressure selector is an intentional functional addition.

## Comparison history

1. Initial rendered comparison found the selected flat-rule hierarchy was present, but the full-page screenshot placed the fixed navigation mid-document. A real 390 x 844 viewport capture confirmed the navigation remains at the bottom; no production CSS change was needed.
2. Theme captures found no Trade-specific palette leakage after the cleanup. No post-comparison Trade fix was required.
3. The first released flat layout left labels and rules too close to the phone edge. The Trade board and Manual Mode now use a consistent 12px horizontal gutter; the revised 390px capture confirms readable spacing with no horizontal overflow.

## Implementation checklist

- [x] Flatten outer Trade board and nested section cards.
- [x] Retain outlined boundaries for real controls.
- [x] Keep all offer-generation and manual-builder behavior.
- [x] Keep navigation fixed at the viewport bottom.
- [x] Verify all five selectable palettes.
- [x] Verify interactions and console output.

final result: passed
