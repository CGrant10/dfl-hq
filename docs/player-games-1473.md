# 1.473.0 — Interactive player games and reliable Sleeper handoffs

The existing player-card chart now supports horizontal finger scrubbing,
tap-to-select week controls and Arrow/Home/End keyboard input. Selecting one of
the already loaded recent weeks updates points, opponent and box score together.
Vertical chart gestures retain native stats scrolling. Passing, rushing,
receiving and other available stat categories expand with a bounded, reversible
220 ms height animation. Missing fields remain absent; zero and negative values
remain real values. No extra weekly requests are made while switching games.

Live context updates only the current week's points and chart. A selected older
week and its expanded stats remain intact. Unchanged updates preserve the score
node and reading position. Fresh openings return to the current week at the top.
The original portrait-first entrance, return, focus and motion preferences remain.

Share performance opens the existing editorial image preview, including its
photo choice, Save image and Share image controls. The selected week, opponent,
score and source state are captured before asynchronous preview loading. Missing
scores and explicit pregame results cannot be shared as performances; recorded
zero scores can. Defense results do not request nonexistent player photos.
Historical data is matched to the selected season's league scoring settings.
Current injury/ownership information remains current rather than being presented
as a historical injury or roster claim.

## Sleeper handoff

The former league-section URLs matched the public web router but did not reliably
select corresponding native-app screens. All shortcuts now use the generic
official app launcher, with the visible label Open Sleeper. Duplicate roster/waiver
and matchup/standings shortcuts have been consolidated.

Checked Sleeper's own [Get The App button](https://sleeper.com/), which links to
[go.slpr.link/sleeper](https://go.slpr.link/sleeper) and redirects to
[the app launch link](https://sleeperbot.app.link/esEa7TDlJN). The latter host's
[published Apple association](https://sleeperbot.app.link/.well-known/apple-app-site-association)
includes both native Sleeper applications and wildcard paths. The ordinary
sleeper.app association lists topic/channel/message links, rather than the web
league section routes. Device preferences, app installation and Sleeper determine
the actual native/store/browser handoff; exact native screens are not promised.
The external links retain safe popup attributes and DFL's existing view.

## Validation

- `pnpm check`: 2,070 tests in 251 files; release, type, names, theme scan and
  production build passed. Final type/name/theme/build checks passed after
  spacing and input-validation cleanup. Bundle remains 79 modules, 3 startup and
  4 Home modules.
- 72 production-controller mobile browser checks in Light/Dark at 320/390px:
  actual horizontal and vertical touch input, keyboard selection, finite stat
  expansion, interrupted/reversed transitions, exact scores/opponents, live and
  unchanged updates, reading position, no additional player requests, bounds,
  existing photo share preview/exportable PNG, missing data and motion preferences.
  No browser errors or backend writes.
- Existing portrait-first player-card and broad sheet gesture/regression checks
  passed, including cached deep-stat reopens and live refresh/recovery.
- 24 Sleeper browser scenarios check the exact generic launch URL, honest label,
  touch targets, safe external navigation, gutters and retained DFL view at
  320/390/768px in both themes.
- Read-only existing Supabase league queries returned the correct 2026 and 2025
  scoring records (50 scoring fields each). Supabase skill changelog/reference
  guidance was checked. Existing public Sleeper weekly stat data confirmed the
  team/opponent/game fields. No schema, auth, RLS, notification or roster writes.

Actual mobile captures and interactive results are retained in
[player-games-1473](player-games-1473/). Native installed-Sleeper opening,
physical iPhone/Safari gesture pacing, low-power mode and high-refresh hardware
remain unverified. Browser handoffs use intercepted external destinations.
