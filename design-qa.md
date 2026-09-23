# Shared Profile/Facts design language QA

## Evidence

- Source visual truth:
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-profile.png`
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-facts.png`
- Representative browser-rendered implementations:
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-trade.png`
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-admin.png`
  - `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots\light-notifications.png`
- Combined comparison: `C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\shared-style-comparison.png`
- Dark-theme verification: corresponding `dark-trade.png`, `dark-facts.png`, `dark-admin.png`, `dark-notifications.png`, and `dark-profile.png` in the same screenshot folder.
- Viewport: 390 x 844 CSS px at device scale factor 1. Every source and implementation screenshot is 390 x 844 pixels. The comparison board is 845 x 2687 pixels and displays each screen at 364 CSS px wide without changing aspect ratio.
- State: authenticated member Martin77; representative normal, empty, and commissioner-login states.
- Console/runtime errors checked during capture: none.
- Primary interactions retained: Trade team/player selectors, slider, offer tiers and manual builder; notification action; profile controls; Admin login forms.

## Full-view comparison

Profile and Facts establish the shared language: a framed page header with a thin red-led top rule, calm rounded content cards, clear horizontal section rules, and deliberate vertical space between sections. Trade now uses that same header card while preserving its intentionally flat workbench. Admin and Notifications use the same red-led divider for legacy section-heading markup. Standard cards receive the Profile/Facts spacing cadence. Home, Golf, Arena Beta, and Broadcast remain outside this shared styling pass.

## Required fidelity surfaces

- Fonts and typography: all pages retain the same Rajdhani display/body family, uppercase structural labels, weight hierarchy, line height, and tracking visible in Profile and Facts. No new wrapping or truncation appeared at 390px.
- Spacing and layout rhythm: standard cards gain the source pages' 16px cadence. Header radius, padding, edge alignment, divider spacing, and mobile gutters visually match. Profile and Facts are explicitly excluded from the new spacing override so the source pages do not drift.
- Colors and visual tokens: red-led rules and red/blue header accents use active palette tokens rather than fixed colors. Light and dark captures remain internally consistent.
- Image quality and asset fidelity: existing crest, watermark, avatar, and icon assets are reused unchanged; no generated, placeholder, CSS-drawn, or replacement imagery was introduced.
- Copy and content: route-specific copy and dynamic league content remain unchanged.
- Icons and interactions: existing icon family, control states, focusable controls, collapsed rows, and tap targets remain intact.

## Focused-region comparison

Individual source and implementation screenshots were inspected at their original 390 x 844 resolution in addition to the combined board. This made the header edge, card radii, 2px dividers, label tracking, button outlines, and bottom-navigation alignment readable without a separate crop.

## Findings

- No actionable P0, P1, or P2 differences remain.
- P3: Sportsbook keeps its stronger branded masthead rather than becoming a literal copy of the plain Profile/Facts page header. This is an intentional page-identity exception that still uses the same radius, top rule, spacing, and palette tokens.

## Comparison history

1. Initial route inventory showed most standard cards already shared the correct surface tokens, but Trade lacked the framed page-header hierarchy and older `.section-head`/Notifications headings lacked the red divider.
2. Added the shared legacy-heading divider, one framed Trade header, and a standard 16px card cadence. Post-fix light and dark captures show consistent hierarchy with no overflow, collision, or theme leakage.
3. Excluded Profile and Facts from the new card-spacing override so the source pages remain the unchanged visual benchmark.

## Implementation checklist

- [x] Preserve Profile and Facts as the visual source.
- [x] Add the red-led section rule to legacy heading patterns.
- [x] Give Trade one source-matched title card without restoring nested control cards.
- [x] Align standard card spacing outside Home and Golf.
- [x] Preserve route functionality and page-specific identity.
- [x] Verify representative light and dark routes at 390 x 844.
- [x] Check console output and horizontal overflow.

final result: passed
