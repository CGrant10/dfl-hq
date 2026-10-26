# Weekly player lines and PPR average — 1.482.0

Home leaders and trackers, Clubhouse side-by-side lineups/bench, GameDay Watch,
and its league player board now show a quiet weekly box-score line and season
PPR points per completed game beneath the player identity and fantasy score.
Receiving/rushing touchdowns combine for skill players in the compact summary;
QB passing touchdowns/interceptions and actual defensive touchdowns remain
specific. Pregame, missing and failed-source states never become invented zeros.

## Correctness and refresh

Rows match the selected regular-season year/week and Sleeper player ID. The PPR
average uses the provider's `pts_ppr` for recorded appearances with `gp > 0`.
Real zero and negative games count; byes and DNPs do not. An ongoing NFL game
joins the average only when that player's game or the selected league week is
final. Later weeks and postseason never leak into an archive average. Missing
completed history or an unreported PPR total makes the average unavailable.
This average is Sleeper's standard PPR total; existing weekly DFL scores retain
the league's actual scoring/bonuses.

One shared weekly payload serves every player and matchup. The current week has
a 60-second budget (explicit refresh bypasses it), the previous week five minutes,
and earlier settled weeks six hours. Existing Sleeper in-flight/cache sharing
prevents duplicate reads between Clubhouse and Watch. Expired JSON requests now
have a 12-second network timeout and retain their stale-cache fallback.

IntersectionObserver defers offscreen Home reads; no new request blocks its
initial shell. A stat-only update patches two labels without replacing the
player tap target, score node, thermal effects, focus or scroll position. Known
stats survive failed refreshes and cached values are identified. Route retirement
and observer teardown prevent late writes to stopped screens. The build remains
85 modules, three startup modules and four Home modules. All three new source
modules are included in the service-worker shell for offline route imports.

## Validation

`pnpm check` passed: 2,191 tests in 263 files, plus release, theme, type,
identifier and production build checks. Model regressions include completed-only
averages, archive/season boundaries, DNPs, zeros, negatives, missing PPR/history,
empty completed-week responses, cached evidence and bounded shared reads.

The real Clubhouse/Watch controllers and shared Sleeper cache passed 68 mobile
checks in Light/Dark at 320/390px. Checks cover real stat lines, PPR averages,
shared requests across matchups/views, final-state updates, retained player and
score nodes, focus/scroll, failures, reduced motion, delayed offscreen reads,
Home density, viewport bounds, 4.5:1 secondary-text contrast and teardown.
Screenshots were captured for Clubhouse, Watch league players and Home leaders;
all four phone/theme Clubhouse captures and narrow Home captures were visually
reviewed. Evidence: `/workspace/dfl-player-week-review/`.

Existing finish/replay and record-art browser regressions passed. The broader
Home matrix also passed: six canonical/legacy/team themes at 320/390/1280px,
paired lineups at 320/390/768px, live-stat focus/scroll retention, cached failure
recovery, pinned scores, sliding tabs, motion preferences, player cards, injury
scrolling and teardown. The matrix reported no browser errors. Evidence is in
`/workspace/dfl-review/browser-checks.json`. Native installed Safari behavior
has not been directly exercised.

## Video feasibility (research only)

Sleeper's documented public API does not expose its highlight-video feed:
https://docs.sleeper.com/. Official embeds or a separate highlight provider can
support tap-to-watch clips. Highlightly documents NFL highlights and requires an
API key: https://highlightly.net/nfl-api/documentation/highlights/.
YouTube supports embeds but reports owner-disabled playback with errors 101/150:
https://developers.google.com/youtube/iframe_api_reference.

No clip provider, paid subscription, autoplay player or placeholder highlight
button was added in this release. A future Watch play action can use a verified
player/game clip, opening its source when embedded playback is unavailable.
