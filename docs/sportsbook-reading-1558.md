# Sportsbook reading — 1.558.0

Sportsbook carries forward the compact Inter typography, quiet theme surfaces
and aligned numbers of the newer Clubhouse and Player Card screens. The
bankroll and claim action share one responsive header; claiming remains an
in-flow 44px action with the existing retry/single-flight/server-balance logic.

The matchup list uses one team/moneyline column header, full team names and
32px Sleeper pictures. Repeated card week labels recede; Moneyline remains
available to assistive technology. All odds share a right edge and grow with
text sizing. Own-matchup emphasis sits outside the common columns and keeps its prices aligned. Current projections, open/lock times and real-time result
markers remain readable.

Props retain independent Over/Under controls with consistent selected colors,
44px favorites and a layout that reflows below the stat at larger text sizes.
Provider identifiers such as DETROIT_LIONS_NFL display as DET without changing
filtering, ownership or player routing. Pick’em uses smaller headings, flatter
sections and consistent controls. The pending route skeleton mirrors the
account/header, two navigation levels and team rows.

Motion stays on the existing shared rail/swipe/press controller. No extra
transition controller, provider request, polling or betting behavior. New
presentation rules live in the existing ordered shared stylesheet.

Validation: 2,486 unit tests plus release/theme/type/name/build checks. The
real-page fixture covers Light/Dark at 320/390/430px: board/claim bounds and
200% text, aligned odds, prop choices/selected contrast/large-text reflow,
Pick’em picks, keyboard/rapid tab changes, Reduced Motion and loading layout.
Claim retry, duplicate tap suppression, authoritative balance and late-response
navigation checks use fixture data only. No test wagers or league writes.

Existing slip suite: 24 layouts with review-before-confirmation, stake updates,
focus restoration, large text and scroll bounds. Existing result suite: 48
checks, including provisional/official results and clean/photo share exports.
Tab/glide suite: 31 checks, including adjacent preview/reversal, Book/My bets/
Pick’em swipes, retained drafts, keyboard and Reduced Motion. Actual compiled
current-data Sportsbook/props/Pick’em renders in both themes without errors or
horizontal overflow; only account reads/claim results are mocked.

Release retains 88 app modules, three startup and four Home modules. Physical
iOS motion frame pacing and VoiceOver speech were not measured.
