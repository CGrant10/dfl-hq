# DFL HQ theme audit — 1.422.0

Reviewed 2026-10-15 using Chromium on the compiled app, with the existing member
profile and read-only league browsing. Primary screenshots: 390 × 844. Home,
Trade and Profile also passed horizontal overflow checks at 320 and 430 px.
Current-run screenshots and computed-color results are retained in
`/workspace/dfl-themes-1422/`; private member screenshots are not committed.

## Findings and corrections

Light still used the former cool background and blue secondary accent. The
current-run Home capture showed blue glyphs and old red labels; the theme picker
also offered both canonical and duplicate Medicine Wheel entries. Dark already
used the warm Medicine ground, but static defaults and profile wash tokens still
contained crest red/blue. These now use the selected palette.

Dark and Light now are the Medicine Wheel palettes. Retired `medicine` and
`medicine-light` selections normalize to `dark` and `light` in local storage,
member synchronization and member switching. Match my phone, Fairway and club
palettes remain supported. No database migration is required.

Text-bearing selected controls use the primary fill instead of a red/yellow
sweep that placed white letters over bright yellow. This covers base buttons,
mode picks, archive controls, avatar fallbacks, Keeper call labels and Sportsbook
selected/hover actions. Decorative gradients still follow both palette accents.
Profile championship labels use readable milestone ink while trophies retain
metallic artwork. Startup grounds and the legacy Arena light-mode plate also
use Medicine colors.

## Screens reviewed in both Light and Dark

1. **Profile / Appearance — healthy.** Four distinct base choices; canonical
   selected state, warm settings surfaces and readable achievement labels.
2. **Home — healthy.** Header, navigation, matchup actions and text follow the
   palette. Broadcast illustrations keep their authored colors.
3. **Sportsbook — healthy.** Board, odds, tabs and Your matchup follow the
   palette; selection fills use the primary color with readable action text.
4. **Trade — healthy.** Workspace and generated offers use the selected ink,
   surfaces and controls; semantic Fair/Aggressive/Steal colors stay meaningful.
5. **Team Analyzer — healthy.** Roster, watchlist and lineup surfaces inherit
   the palette, with semantic status colors retained.
6. **Clubhouse — healthy.** Week controls, matchup cards and score text match
   the shell and selected theme.
7. **Keepers — healthy.** Advisor surfaces and call labels remain readable in
   both modes; numeric labels use the appropriate ink.
8. **Rules — healthy.** Tabs, text and dividers match the selected palette.
9. **History — healthy.** Navigation and champion cards use the correct ink;
   text-bearing selected archive controls no longer rely on yellow gradients.

## Repeatable checks and limits

`pnpm themes` runs in the standard `pnpm check` pipeline and rejects retired
crest accents in authored CSS. Runtime regressions cover local and synced alias
migration, system mode, pinned pages, club preferences, base text contrast and
startup appearance. All text inks checked against base surfaces and eight
representative selected controls in each default theme meet 4.5:1 contrast.

No old UI accents were found in the computed colors of the nine reviewed screens
in either mode, and no page JavaScript errors were observed. This is not a full
accessibility conformance claim. Admin-only workflows, every transient dialog,
native mobile popups and every populated state were not exhaustively exercised.
NFL/member identity colors, semantic statuses, authored images, share exports and
the intentional Fairway palette have their own color roles; they are not treated
as theme leaks. The new `AGENTS.md` records the requirement to audit both mobile
modes for future color changes.
