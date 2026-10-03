# Home broadcast and header — v1.280.0

The league matchup slate now leads the Home broadcast. Injury coverage follows as two cards with at most two different players each, preserving priority and access to the complete report. Empty feeds use one card.

Header controls use compact icons and a subtle colored role indicator. Profile names have flexible width instead of fixed truncation limits, an accessible full-name label, and can wrap on narrow screens. Member red and commissioner yellow remain visible before toggling; access behavior is unchanged.

Validation: pnpm check passed (1,022 tests across 113 files, type checks, names check and build). Chromium checks verified matchup first, two nonduplicating injury cards, full report filtering and refresh failures, Escape focus return, route cleanup, light/dark themes, and no WCAG A/AA violations or horizontal overflow at 320, 390 and 768px. GrantsTweaking fits within the profile control in both role states and remains on one line at 390px and above. The injury dialog also passes at 200% text size.

## v1.281.0 interaction corrections

Injury report opening focuses its heading, including native dialog autofocus, rather than a text field. Search remains available on tap. Header order is search, notifications, profile and access mode, with consistent six-pixel gaps. Shared hover/press transforms exclude broadcast arrows so their translateY(-50%) centering remains intact.

Validation: all 1,022 tests and build checks pass. Chromium verifies both arrows keep their vertical center at rest, hover, pointer-down and after switching slides; the dialog initially focuses its heading and search focuses on tap. Existing full-report, mobile full-name, theme, accessibility, enlarged text and route-cleanup checks pass.

## v1.282.0 visible access switch

Restored the access control's visible 28×16px switch track and 12px sliding thumb. Commissioner sits on the left in yellow, member view on the right in red; the role label, 44px touch target, keyboard behavior, reduced-motion preference and PIN rules remain intact.

Validation: 1,022 automated tests and build checks pass. Chromium checks both thumb positions, track bounds and role colors at 320, 390 and 768px, profile-name fit, plus the existing broadcast-arrow, injury-dialog, accessibility and route-cleanup checks.
