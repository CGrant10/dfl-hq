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

## 1.429.0 — Shared daily broadcast and player comparisons

Reviewed actual Home broadcast slides in Medicine Wheel Dark and Light at 390px,
including the daily opener, playoff odds dial, anniversary timeline, champion,
Chip Eater, scout and archive. The opener retains its existing artwork and uses
one Chicago calendar date and a curated 60-day saying rotation for every member.
It has no personal matchup, promoted transaction or hidden destination. All 60
sayings were measured at 320px/390px in both modes without clipping. The new
number/anniversary compositions use shared text, accent, surface and line tokens;
champion artwork remains uncropped and decorative logos are not added elsewhere.

Reviewed the comparison sheet in Light/Dark at 320px/390px with production CSS and
controllers, both deterministic intercepted reads and guarded actual league
reads. Existing player portraits, compact DFL type and theme colors carry into
the two-column comparison. Chromium checks cover visible text contrast, long
names, search, tab keyboard controls, stale request rejection, refresh/retry,
current owner names, focus return, header drag dismissal and keyboard viewport
bounds. WebKit captures cover the same phone widths, selection, refresh/retry,
keyboard tabs and reduced motion. Native phone frame-rate, physical keyboard
behavior and VoiceOver/TalkBack are not certified by these browser checks.

Weekly projections, league-scored completed games, FantasyPros rest-of-season
ranks and DFL trade values remain separate. Missing or stale game evidence is not
turned into zero; partial current games are excluded from the completed sample.
The comparison loads on demand and adds no startup/Home module requests. App
motion-off and reduced motion keep static, usable controls. No backend/schema
changes, production trades, posts, notifications or bets were made.

## 1.430.0 — Arena control access and composed Home

Reviewed Home with guarded actual league reads in Medicine Wheel Light and Dark
at 320px/390px: the tighter masthead, aligned matchup scores, lineup/Clubhouse
entry row, independent daily broadcast, champion and Chip Eater posters, and the
archive's large lead story with compact supporting receipts. Award artwork stays
contained with breathing room and no splatter or extra league logos. Long names,
owner text and historical chips wrap inside a separate copy column. Broadcast
entrances use small translated/faded groups and leave the gesture transform free;
reduced motion and the app motion switch disable the new choreography.

The explicit Clubhouse link preserves the existing GameDay entry. Supported
browsers connect visible team identities by roster ID; matching actual totals can
travel with them. Forecasts and changed totals are not presented as unchanged
actual scores. Unsupported browsers, offscreen targets and motion-off keep normal
navigation. Browser and unit checks cover reversed columns, name cleanup, reduced
motion, ordinary route memory and interrupted navigation. Startup and Home module
request counts remain three and four respectively.

Reviewed the actual Stadium controller with isolated commissioner/spectator data,
including Light/Dark portrait editing, landscape expanded controls, a pending
orientation-lock request, native-fullscreen mocks, unsupported-fullscreen fallback,
paused duration edits, sealed results and cleanup. The portrait gate covers only
the field and does not take focus from an editor. Commissioner controls live
inside the expanded stage; Edit exits that view. Explicit exit releases the owned
orientation lock and remains closed across resize. Commissioner forms use app
surface/text/control tokens; the field retains its dark stadium lighting.

Live league verification is guarded against race commands, kit saves, trades,
posts and notifications; race mutations are exercised only against the local
fixture. Physical device orientation-lock behavior, native Safari fullscreen and
VoiceOver/TalkBack are not certified by desktop browser checks. No database,
permissions, scoring, race draw or notification policy changes were made.

### 1.431 — round in-app branding

Restored the approved black-and-white circular seal at the shared logo paths
used by card watermarks, identity plates, headers, splash and share cards. Arena
field branding uses the same round mark. The brand asset builder preserves these
approved seal bytes; only launcher assets are generated from the shield. App
icons, notification icon assets and the update-screen shield are unchanged.
Reviewed the actual shared watermark and identity-plate styles at 320px and
390px in Medicine Wheel Light/Dark, including the share-card seal. Text remains
above the decorative mark, existing opacity/inversion rules remain intact, and
neither phone width overflows. No new colors, theme options or motion were added.

### 1.432 — Arena watch controls and past races

Reviewed the compact fullscreen watch toolbar, all three cameras, racer picker,
commissioner controls, portrait editor and past-race removal in Medicine Wheel
Light/Dark. Camera controls stay inside both native fullscreen and the landscape
fallback, with 44px targets. The canvas heading now uses 30–44px instead of
94–128px; the callout is a compact separate row and does not cover the field.
Portrait pages at 320px/390px/768px retain accessible management controls without
horizontal overflow. Past-race cards, confirmation, errors and empty state use
theme tokens; text contrast is checked in both themes. Stadium watch surfaces
retain their existing dark lighting and motion preferences.

Browser tests cover live reset/cancel, camera selection without exiting watch,
deletion/cancel/stale revisions, spectator restrictions, shared racer-kit
preservation, a removed race's viewers, final order and subscription cleanup.
Isolated PostgreSQL tests cover the actual command functions, atomic live reset,
locked finishes, linked result deletion, legacy completed races and public/private
permissions. The existing Arena permission gate remains in place; no real races
were reset or removed. The Arena winner generator and result-to-slide trigger
are removed; existing generated Arena Aftermath cards are inactive. In broadcast,
league champion/Chip Eater slides are retained. Native physical-device orientation
and assistive-technology behavior remain outside desktop browser certification.


### 1.433 — Home broadcast reading and editorial coverage

Removed generated personal-matchup previews and the league scoreboard from
Home's broadcast; GameDay keeps the scores above it. The daily league opener,
scouting, awards and other editorial stories keep their existing compositions
and shared Medicine Wheel tokens. The opener receives five seconds once the
card is readable rather than starting at the first visible pixel.

The real controller regression covers below-fold startup, partial visibility,
scroll-away/return with a fresh dwell, preserving a manually chosen slide, short
landscape viewports, reduced motion and listener cleanup in Light/Dark. Screens
are captured with production styles and palette assignments. Existing Home
review also covers mobile widths, all broadcast treatments, swipe reversals
and refresh-under-finger. No colors or appearance options changed. Physical
device browser-chrome resizing remains outside desktop browser certification.


### 1.434 — Composed awards and smooth scroll motion

Reviewed champion/Chip Eater slides at 320px, 390px, 430px and 832px in
Medicine Wheel Light/Dark, including authored member artwork. The complete
contained illustration now fills the card as a masked tonal backdrop, with a
soft left/bottom dissolve and no sticker shadow. Copy has 78% of the width
instead of 46%; existing faint CHAMP/LAST lettering remains decorative.
Artwork opacity stays at .38 in Dark/.26 in Light after its entrance finishes;
the prior generic entrance was overriding its resting opacity. No image files
were changed. Existing theme tokens control the surface, type and wash.

Home's compact-score path now retains the section entrance observer. Headings
enter once with a short eased rise, without moving surrounding content or
replaying on scroll-back. Scoreboard collapse has zero acceleration at its
endpoints and remains directly tied to scroll position. Decorative broadcast
depth has a bounded 6px range and a 140ms CSS settle, disabled under the finger,
for reduced motion and for in-app motion off. No persistent animation frame loop
was added. Browser regressions cover reversal, exact score endpoints, live score
changes, no layout shifts, reveal-once behavior, decorative settling and cleanup.
Physical-device GPU/frame-rate measurement remains outside desktop certification.


### 1.435 — Named scroll scoreboard and separated award artwork

The prior award backdrop deliberately sat behind text; user feedback rejected
that overlap. Copy now owns full-width upper rows. The faint vertical CHAMP/LAST
stamp and contained picture have separate columns below, with measured gaps
between all text and the image. Award artwork stays anchored during decorative
depth so scrolling cannot move it into text. A shared grid-row measurement counts
its bottom row once, avoiding a tall empty carousel. Light/Dark screenshots and
24 layouts cover 320px, 390px, 430px and 832px, including custom artwork. No image
files changed. Surface, type and washes retain shared Medicine Wheel tokens.

The scroll scoreboard now includes each current team name both in motion and
in its compact destination. Labels wrap fully, share name/score rows so scores
stay aligned, and refresh from the same team-name nodes as the main matchup.
Six decorative copies move using cached geometry; name copies retain the target
wrapping and use uniform scale. Tests cover 320px/390px/430px in Light/Dark,
reversal, score/name updates, aligned wrapped names, reduced motion, motion off,
layout stability and cleanup. Native physical-device frame rates remain outside
desktop browser certification.

Home section jumps also reserve the compact scoreboard's measured height. Native
swipe regression points are checked against the visible carousel surface, so
they cannot accidentally start underneath the newly taller named scoreboard.


## 1.436.0 — Broadcast compositions and full trade tickets

Captured the current mobile broadcast and trade flow before editing. The old
suggestion hid supporting players and used almost an entire phone viewport for
a simple exchange. The secondary broadcast cards had inconsistent visual scale.

Trade suggestions now expose every player in two compact columns, retaining
44px player/detail targets, wrapped full names, price balance, both projected
lineup changes, horizon, risk flags and required cuts. The detailed manual desk
and share cards retain their full data. Removed obsolete offer CSS from the
shared decision sheet so it cannot restore the large old layout. New entries
shop all teams; manual drafts survive separately and explicit player-target
links still select their owner.

Award headlines span the whole poster. Owner/banter and a full contained figure
occupy separate grid columns; the title and footer sit outside the art. The
remaining editorial slides share a theme-token plate with stronger stat, scout,
archive, calendar and trade compositions. The daily opener is unchanged. No
shield or decorative league logo was added to secondary broadcast stories.

Reviewed Light/Dark full-package tickets at 320/390/430/768px, including 4-for-4
and 7-for-1 exchanges; all names remain visible without expansion or horizontal
scrolling. Award review covers Light/Dark at 320/390/430/832px with actual image
containment, copy/headline/art/footer separation and contrast checks. Home's
full themed slide, gesture, scroll and motion-preference suite remains required
before merge. Shared navigation and startup retain the existing palette.

Search refinement is bounded, runs in the worker, and reuses the existing PPR
1-QB model. It does not relax evidence freshness, QB, availability, roster-cost
or comparable-star checks for Steal labels. Startup/Home bundle requests remain
3/4. Browser verification does not certify physical-device frame rates or full
screen-reader compliance.


## 1.437.0 — GameDay readiness

Reuses existing Medicine Wheel Light/Dark surfaces and lineup warning markup.
Confirmed-out starters favor the strongest healthy unlocked backup; questionable
starters retain late-game cover. Warning statuses and kickoff locks share the
rescue-plan rules. Confirmed issues expand within the 90-minute decision window.
No new colors or permanent explanatory subtext. Home mobile/themed review is a
release gate.

Focus/return refreshes coalesce with online and visibility signals. Home and
Clubhouse share in-flight weekly score reads; cache age starts on success.
Catch-up snapshots update scores without celebrating historical jumps. Moment
priority and motion preferences are preserved. New banter cites completed,
slot-eligible bench mistakes, excluding projections and unfinished players.
Alert recipient, expiry, grouped keys and escalation rules are retained.

The managed workspace was unavailable during preparation. Build, unit and
browser verification use GitHub's runner. Physical-device frame rates and
end-to-end push delivery remain unverified; no test notifications are sent.


## 1.438.0 — Home follows the week

Home reuses the weekly desk, live leaders and completed report rather than adding
another scoreboard or broadcast matchup. NFL event states and confirmed league
completion determine pregame, live, between-games and final priority. A saved
previous-week final cannot override the current week's schedule. Forecasts and
the dated recap have separate places. Wall remains last.

Existing nodes move only while below the viewport or Home is at the top, with
focused controls protected. Phase-specific disclosure choices are retained.
Compact actual-score league matchups and final receipts use shared Light/Dark
text, surface, border and focus tokens. Full names wrap at phone widths. No new
logo, fixed overlay, explanatory subtext or continuous animation.

Verification uses GitHub runners because the managed workspace is unavailable.
Mobile Light/Dark phase screenshots and browser checks cover section ordering,
focus, scroll stability, links, missing data, confirmed final results and ties.
Physical-device frame rates and live authenticated data remain unverified.

Reviewed actual 390px screenshots: Light final receipts and Dark live league
matchups. Scores remain aligned, long team names wrap, and the new surfaces
use the app's existing Medicine Wheel hierarchy. Twelve phase/theme/phone-size
captures passed with no overflow or browser errors; focus, reading position,
per-phase preferences and controller cleanup passed in Chromium.

## 1.439.0 — Signature matchup finishes

Finished GameDay Watch and Clubhouse matchups reuse their existing two-team
scoreboards. A compact result line replaces the duplicate Clubhouse summary and
chirp, with replay and the existing share-card presentation. Clutch wins (up to
one point), close wins, ordinary wins, blowouts and ties use actual rounded
hundredths and confirmed weekly completion. No live lead or unknown score earns
a final celebration, and no upset is inferred without evidence.

Motion reveals the real score digits, followed by the margin and roast. It is
finite, waits for visible scoreboards, respects Motion off and reduced motion,
and cancels on hiding or teardown. A bounded local record shares once-per-member,
league, season, week and matchup behavior between the two surfaces. Corrections
update the receipt without replaying. Archive Clubhouse views are static unless
Replay finish is requested.

Reviewed actual Light and Dark screenshots of Clubhouse clutch, blowout and tie
receipts and GameDay Watch, at 320px and 390px. Names wrap, values stay aligned,
new actions meet 44px targets, and no horizontal overflow was found. Shared text,
border, accent-sweep and focus tokens preserve the Medicine Wheel defaults; no
new logo, asset, palette entry or permanent explanatory subtext was introduced.
Fixture-backed Chromium checks cover automatic playback, cross-surface dedupe,
corrections, replay, selected share payloads, archives, motion switches and cleanup.
GameDay opens at the top; replay expands a scrolled compact scoreboard before
revealing the teams. The browser review verifies that scroll and compact-state reset.
Physical-device frame rates, authenticated live data and native share delivery
remain unverified.

## 1.440.0 — Arena direction, story layouts and trade connections

Reviewed Light/Dark award, injury, two-/three-team trade and rivalry broadcasts
at 320/390/768px. Awards retain the full contained silhouette and theme-specific
opacity; Chip Eater reverses the composition. Text, dividers, focus indicators,
trade fit labels and pre-race readiness use shared palette tokens. Stadium turf,
uniforms and its deliberately dark viewing surface retain their identity colors.

The production Arena fixture covers portrait commissioner editing and landscape
viewing, full-screen camera controls, readiness, remote anonymous reactions,
finite local goal-line replay, motion preferences and cleanup. New spectator and
replay actions have 44px targets. The opt-in Sound control defaults off. Trade
offer/detail connections were reviewed at 320/390px with focus return, reduced
motion, resize cancellation and teardown. No new palette, logo, explanatory
subtext or share-card design was added.

Screens and machine-readable checks: `/tmp/dfl-1440-home/art-*.png`,
`/tmp/dfl-1440-arena-final/` and `/tmp/dfl-1440-trade/`. See
`docs/arena-broadcast-trade-upgrade-validation.md` for data and runtime limits.
Physical-phone haptics, native screen-reader output and hardware frame rates
remain unverified.

## 1.441.0 — Arena portrait theater

Reviewed actual Chromium screenshots at 320, 390 and 768px in both Light and
Dark: live Auto/Field/Follow scenes, selected camera states, normal-size labels,
Crowd beside commentary, commissioner actions, portrait forms and finished-race
controls. Also reviewed landscape fullscreen and portrait expanded theater.
Evidence: `/tmp/dfl-1441-arena-final/`.

The stadium viewing frame retains its intentional dark sports presentation and
meaningful kit/field colors in both app themes. Surrounding headings, metadata,
readiness and editor continue using shared theme tokens. No additional theme
choice is introduced. Retired rotation-gate styles and positioning rules that
pushed the Crowd button over the field are removed. Camera labels fill their
segments, and active/keyboard states remain visible. New scene motion respects
app/OS reduced-motion settings. Theme checks run with the release checks.
Physical-device fullscreen, performance and screen-reader output remain
unverified; functional layout and focus behavior are exercised in Chromium.

## 1.442.0 — Arena showdown and layered stadium

Reviewed actual Chromium screenshots for 320/390/768px Auto showdowns in Light
and Dark, plus Field/Follow, portrait expanded viewing, landscape fullscreen,
paused races, countdown and official finishes. Phone close-ups use columns;
wider feeds use rows. Names, live ranks, jersey identifiers and gap labels fit
inside each scene without shrinking the surrounding controls. Evidence is in
`/tmp/dfl-1442-arena-final/`.

The stadium remains an intentionally dark sports scene; new labels use warm
light/gold text over a dark header wash. Identity stripes retain actual racer
colors. Surrounding page/forms retain shared theme tokens, and no theme options
are added. Reduced motion suppresses close-ups/parallax and uses the full field.
The two scenery tiers reuse existing artwork. Actual source offsets and a
pixel-stable paused view are checked in the browser fixture. Device fullscreen,
physical frame rates and assistive-technology output remain unverified.
