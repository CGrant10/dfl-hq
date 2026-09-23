# Shared Profile/Facts design language QA

## Evidence

- Viewport: 390 x 844 CSS pixels, mobile emulation at device scale factor 1.
- Visual references captured in this run:
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-profile.png`
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-facts.png`
- Updated representative routes captured in this run:
  - Light: `light-finances.png`, `light-proposals.png`, `light-analyzer.png`, `light-admin.png`, and `light-sportsbook.png`.
  - Dark: `dark-finances.png`, `dark-admin.png`, and `dark-sportsbook.png`.
- Screenshot folder: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots`
- State: authenticated member Martin77 with representative populated, empty, and commissioner-login screens.

## Audit steps

1. **Reference pages — healthy.** Profile and Facts retain their existing card geometry, spacing, typography, and section-divider treatment. They are excluded from the new overrides and remain the visual benchmark.
2. **Page framing — healthy.** Ordinary page titles use the same rounded framed header, thin top accent, mobile gutter, and vertical separation as Facts.
3. **Card hierarchy — healthy.** Direct card labels and card title rows now carry a visible DFL-red divider rail before their content. The rail remains red in both light and dark palettes rather than inheriting a member color.
4. **Spacing — healthy.** Standard cards and the principal analyzer/offer panels use a consistent 20px vertical cadence. Nested content remains compact and no horizontal overflow appeared at 390px.
5. **Exceptions — healthy.** Home and Golf remain untouched. Sportsbook keeps its branded masthead while sharing the same card rhythm and divider language below it.

## Findings

- The first pass was too subtle because most routes already inherited the same outer card shell; only legacy headings and the Trade title changed visibly.
- The follow-up moves the shared language inside the cards, making the change clear on Finance, Proposals, Admin, Sportsbook, and other ordinary routes without restructuring their content.
- No visible collisions, clipped labels, navigation shifts, or contrast regressions were found in the accepted captures.
- Screenshot review cannot prove keyboard order or screen-reader output; automated and interaction checks cover the unchanged markup and controls.

## Implementation checklist

- [x] Preserve Profile and Facts as the source pages.
- [x] Add fixed DFL-red divider rails to ordinary card titles and title rows.
- [x] Standardize space between cards and major content panels.
- [x] Preserve Home, Golf, route-specific content, and working interactions.
- [x] Verify representative light and dark screens at 390 x 844.
- [x] Run the full automated suite and production build.

final result: passed
