# DFL HQ color-theme audit

## Scope and evidence

Captured on a 390 x 844 mobile viewport at device scale factor 1. The current audit produced screenshots under:

`C:\Users\GUEST\Documents\Codex\2026-08-31\okay\theme-audit\screenshots`

Five palettes were checked on Home, Trade, and Analyzer: Light, Dark, Fairway Light, Medicine Wheel, and Medicine Wheel Light. Light and Dark were also checked across Rules, Keepers, Polls, Proposals, Calendar, History, Facts, Fees, and Notifications. Golf was not redesigned; it retains its intentionally pinned Fairway presentation. Arena/Broadcast cinematic scenes were treated as authored media rather than ordinary themed app surfaces.

## Steps

1. **Home — repaired, healthy.** The new Home composition had locally pinned dark background/text tokens. That made light palettes render a mixed dark/gray feature with mismatched text. Home now inherits the selected palette for the matchup, power rankings, and weekly report. The anniversary photograph remains intentionally dark branded artwork.
2. **Trade — healthy.** All five palettes use the correct page, control, divider, text, muted, accent, and semantic-status tokens. Native controls receive the correct `color-scheme` through the theme runtime.
3. **Analyzer — healthy.** Light palettes contain no dark card leftovers; Dark and Medicine Wheel contain no white/light surface leftovers. Semantic injury/trend pills remain purposefully colored.
4. **Rules and Keepers — healthy.** Cards, tabs, advisor surfaces, and roster rows switch consistently in Light and Dark.
5. **Polls and Proposals — healthy.** Empty states and collapsed controls use the selected surface and divider tokens.
6. **Calendar and History — healthy.** Tabs, date cards, tables, and archive surfaces stay within the selected palette.
7. **Facts and Fees — healthy.** Story cards, stat grids, dues rows, and status colors remain readable and theme-correct.
8. **Notifications — healthy.** Header, enable prompt, inbox empty state, and accent action all follow the selected palette.
9. **Shared chrome — healthy by design.** The top bar and anniversary photo remain dark brand anchors in light themes, matching the approved Home/Trade references. Bottom navigation, ticker, page canvas, controls, and content surfaces switch with the theme.

## Fixes made

- Removed Home's hardcoded local dark palette.
- Mapped Home surfaces, dividers, type, muted copy, and status movement colors back to global theme tokens.
- Replaced the Weekly Report's fixed dark-green tint with a palette-derived surface mix.
- Added a regression test that fails if Home pins page-level background, text, or divider tokens again.

## Accessibility notes

Visual review found no obvious light-on-light or dark-on-dark remnants on the audited screens. Screenshot review cannot prove keyboard focus order, screen-reader output, or native popup rendering on every mobile OS; runtime `color-scheme` handling and automated tests cover the native-control theme handoff.

## Evidence limits

Privileged commissioner/admin-only states, transient errors, dialogs, and every possible populated/empty combination were not exhaustively captured. The shared token system and source scan cover those surfaces structurally, but this report does not claim full accessibility conformance from screenshots alone.
