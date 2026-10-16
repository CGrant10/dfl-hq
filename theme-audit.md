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
Fairway retains its green/blue palette, with the primary green deepened so small
white action labels stay readable. Profile championship labels use readable milestone ink while trophies retain
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
startup appearance. WebKit additionally passed Home and Appearance in both modes.
An installed-app update from 1.421.0 retained Light and the selected member while
replacing the cached blue accent and old action CSS. All text inks checked against base surfaces and eight
representative selected controls in each default theme meet 4.5:1 contrast.

No old UI accents were found in the computed colors of the nine reviewed screens
in either mode, and no page JavaScript errors were observed. This is not a full
accessibility conformance claim. Admin-only workflows, every transient dialog,
native mobile popups and every populated state were not exhaustively exercised.
NFL/member identity colors, semantic statuses, authored images, share exports and
the intentional Fairway palette have their own color roles; they are not treated
as theme leaks. The new `AGENTS.md` records the requirement to audit both mobile
modes for future color changes.

## 1.423.0 — Home editions and Trade workbench

Reviewed the compiled Home, Trade and Appearance screens at 390px in both
Medicine Wheel modes, with overflow checks at 320px and 430px. The existing
four Appearance choices, shared navigation, notification badge and selection
states remain consistent. The visible trade inputs, offer packages, risk drawer
and projected starter changes use shared surface, text and accent tokens.

Home's live-score, final-score and rivalry editions were additionally checked
at 320px, 390px and 768px in both modes: readable copy, no clipped content, no
horizontal overflow and exact matchup destinations. Their text-bearing shade
uses the selected theme ground; the broadcast artwork retains its authored
colors. Trade controller fixtures cover the searchable inputs, populated player
chips, three-team destinations, saved comparisons, counteroffers and required
drops at 320px, 390px and 768px. Both modes were visually inspected on mobile.

`pnpm check` passes the palette audit, theme regressions, type checks and all
1,814 tests. No new palette, valuation source, backend fetch or startup module
was added. This review covers the changed screens and representative populated
states; it does not repeat the nine-screen audit above or claim exhaustive
coverage of every dialog, native control or possible league story.

## 1.424.0 — Trade discovery and independent judgments

Reviewed the Trade workbench, offers and manual results in Medicine Wheel Dark
and Light on phones. Price balance, projected lineup fit and data risks now have
separate visible roles. The added fit/window text uses existing body and muted
ink tokens. Player identity colors and semantic risk colors retain their roles.

Browser fixtures cover 320px, 390px and 768px, including searchable player inputs,
league-wide need shopping, the planning-window control, schedule failure/retry,
three-team routing, saved deals, counteroffers and receipt navigation. The
four-week view shows its actual week range; a missing schedule visibly returns
to the rest-of-season view. Both modes and the existing selected controls remain
part of the mobile review. No palette or theme picker entries were added.

The existing Home order and Wall position are unchanged. This review is scoped
to Trade and its shared shell, rather than a repeat of every screen and possible
roster state. The standard palette audit and relevant model/theme regressions
run with the complete release checks.

## 1.425.0 — Start/Sit decisions and navigation

Reviewed the shared Home and Analyzer Start/Sit layouts in Medicine Wheel Dark
and Light on mobile. The comparison uses two columns, complete player names,
portraits, clearly separated projections and restrained theme-token dividers.
It keeps the unfilled rows requested previously. Calls, injury contingencies,
recent scoring averages and kickoff times use shared ink/accent tokens; NFL
portrait identity colors retain their role. No theme choices were added.

Populated Home fixtures were inspected at 320px, 390px and 430px in both modes,
with clipping, overflow and visible-text contrast checks. Real league Home and
Analyzer captures also cover both modes. The current roster has no recommended
swap; injury backups, FLEX reshuffles, unknown projections and kickoff locks
are covered by deterministic fixtures/model tests rather than claims about
live recommendations. Weekly advice remains Sleeper projections scored with
league settings; rest-of-season expert rankings are not called weekly ECR.

The router review covers fresh visits, actual Back/Forward traversal, repeated
Home visits, same-page navigation taps, failed loads, retries, rapid navigation,
reduced motion and fixed shared navigation. Back restores an individual visit;
ordinary visits keep page choices without restoring an old scroll offset.
Theme and release checks run with the full application regression suite. This
review covers the changed components, not every possible roster or native UI.

## 1.426.0 — Mobile decisions, readable text and GameDay recap

Reviewed Home, compact Trade search and offers, Analyzer and the optional
GameDay recap in Medicine Wheel Light and Dark. New surfaces use shared ground,
ink, accent and border tokens. NFL/player identity and injury/status colors keep
their roles. Dark/Light remain the canonical themes; readable text is a separate
opt-in device preference and does not create another palette.

Trade captures cover 320px, 390px and 430px. Large packages keep every player,
with supporting players behind explicitly labeled disclosures. Tests preserve
expanded packages while more offers load, full eight-player and multi-team
routing, saved comparisons, counteroffers and required drops. Simplicity affects
ordering only inside comparable fit/price bands; valuations and verdicts are
unchanged. Home suppresses the exact transaction already covered by its active
banner, then restores that broadcast story on dismissal.

Analyzer now puts the roster report before follow-up tools and keeps an empty
watchlist compact. The report has normal screen gutters. More leads with
football/records, with Wall below the other league-life entries. Page arrivals
have a concise status announcement and descriptive document title rather than
placing the entire changing page in a live region. Existing scoped live-score
announcements remain, with a selected-score announcement added in Watch mode.

Readable text was checked on Home and Trade in both modes, including a persisted
Profile toggle, reload without a compact-text flash, 320–430px reflow and 200%
root text resizing. This is not a claim of full native browser text-zoom or
VoiceOver certification. Physical iOS/Android screen-reader testing remains
unverified; browser accessibility names, focus, Escape and disclosure behavior
were inspected/tested.

Recap captures and browser tests cover 320px/390px Light and Dark, chronological
saved observations, manual stepping, Play/Pause, stable frames during score
refreshes, focus return and reduced motion. Recap frames use observed sync times,
not invented NFL play timestamps or predicted winners. Live week data may have
no saved moments yet; the replay states were verified with labeled fixtures
using the production controller. No external messages, trades or bets were made.

## 1.427.0 — Smoother scrolling

Reviewed the Home score-to-dock transition in canonical Medicine Wheel Dark and
Light at 320px and 390px with guarded real league reads. Isolated production
controller captures cover 320px, 390px and 430px in both palettes. Shared colors,
text sizes and navigation are unchanged. The original team labels recede while
decorative score/identity copies move, then return when scrolling back. Document
height and following content positions stay fixed.

Home now measures flight endpoints on data/layout changes and moves copies with
transforms. It eases at both ends without adding a trailing scroll loop. Shared
page headers cache section offsets until observed layout/data changes; heading
entrances move 6px with a softer fade. Reading progress follows the scroll frame
directly. GameDay's compact scoreboard has a 12px reversal buffer to avoid
threshold flicker. Browser checks cover reversal, changed scores, resizing,
layout invalidation, reduced motion, the in-app motion switch and cleanup.
The dedicated controller checks pass in both Chromium and WebKit. Number copies
scale uniformly to the destination font size, with a regression check immediately
before the dock handoff to catch distorted or abruptly resized glyphs.

An isolated Chromium comparison of the old/new Home controllers over the same
120-frame scroll sequence recorded 120 versus 0 layout recalculations during
that sequence. This measures that controller's layout work, not a physical phone
frame-rate guarantee. Native iOS/Android hardware profiling remains unverified.
No palettes, backend data, posts, notifications, bets or trades were changed.

## 1.428.0 — Connected player interactions and steady refreshes

Reviewed the production player-card controller in Medicine Wheel Light and Dark
at phone widths, with labeled sample data and intercepted reads. Chromium sheet
captures cover 320px/390px/600px; WebKit player-card captures cover 320px/390px.
The card's typography, identity colors and shared theme tokens are unchanged.
Buttons, selections and disclosures share brief press feedback. Tab geometry
stays fixed for the travelling underline; its press wash uses accent/bg tokens.
Reduced motion and the app motion switch retain static, usable controls.

An interrupted portrait return begins at the visible travelling copy's rectangle
rather than jumping to the stationary card image. Flights clean up on scrolling,
viewport changes, visibility changes and motion-setting changes. Browser checks
exercise interrupted reversal, native body scrolling, drag cancellation,
keyboard-viewport math, early dismissal and focus return. WebKit reversal checks
pause the flight deterministically; native hardware frame-rate and screen-reader
behavior are not certified by these synthetic checks.

Trade/Analyzer refreshes wait for scroll/finger activity to settle, preserve the
visible player or section before repaint, and restore open disclosures. Missing
anchors use the previous offset. Ordinary route visits and Back memory keep their
existing behavior. Unchanged player scores retain their DOM node and hot/cold
visual rather than restarting on each sync. Chromium and WebKit checks verify
refresh anchoring; the trade workspace review covers three widths with no browser
errors or horizontal overflow. No backend/schema changes or league writes occur.
