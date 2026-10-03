# Home broadcast and header — v1.280.0

The league matchup slate now leads the Home broadcast. Injury coverage follows as two cards with at most two different players each, preserving priority and access to the complete report. Empty feeds use one card.

Header controls use compact icons and a subtle colored role indicator. Profile names have flexible width instead of fixed truncation limits, an accessible full-name label, and can wrap on narrow screens. Member red and commissioner yellow remain visible before toggling; access behavior is unchanged.

Validation: pnpm check passed (1,022 tests across 113 files, type checks, names check and build). Chromium checks verified matchup first, two nonduplicating injury cards, full report filtering and refresh failures, Escape focus return, route cleanup, light/dark themes, and no WCAG A/AA violations or horizontal overflow at 320, 390 and 768px. GrantsTweaking fits within the profile control in both role states and remains on one line at 390px and above. The injury dialog also passes at 200% text size.
