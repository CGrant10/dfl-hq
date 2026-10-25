# Red Zone Watch and verified player moments — 1.475.0

Home's existing live details, Clubhouse's selected matchup and GameDay watch now
share a compact Red Zone Watch. It appears when a selected starter's NFL offense
has possession inside the opponent's 20, with explicit provider red-zone status,
valid down/distance and a consistent field position. It does not claim the player
is currently on the field. The expanded panel includes a miniature field, clock,
down/distance, latest play and checked time. Keyed live updates retain the field
marker, focus and expansion state. Home counts additional games and expands
the compact preview to the full relevant list; full matchup views do not cap it. The marker moves without rebuilding its DOM.

Starter rows gain a small red-zone indicator. Verified touchdowns and big plays
can lift the player's portrait, briefly accent the row and show one readable
player moment. A stacked passer/receiver play produces one banner. The banner
uses the member's involved starters to distinguish TD PASS from TOUCHDOWN, even
when the receiver belongs to the opponent. Passing big plays require 40 yards;
rushing/receiving big plays require 20. Touchdowns require an explicit offensive
TD play with six NFL scoring points, not a fantasy-point jump. Fantasy points
are never invented from an NFL touchdown label.

Effects are bounded, share a deduplication registry, remain visible inside native
GameDay dialogs, respect reduced/app motion preferences, and clean up on close,
visibility changes, navigation and teardown. Opening a view establishes a baseline;
old plays do not replay. Phone pushes can still arrive while the app is closed.

## Data and delivery

The live-football worker uses the existing private scheduler credential and
configured active Sleeper league. It fetches NFL scoreboard and summary data,
then resolves candidate plays against the public detailed play feed. It never
follows arbitrary provider `$ref` hosts. Public URLs are constructed from
validated numeric IDs. Missing player attribution, penalties, reversals,
turnovers, unsupported types and ambiguous identities cannot celebrate.

Sleeper leaves some ESPN IDs empty. The fallback uses an official structured
athlete profile and requires a unique exact normalized name, NFL team and
position match. It never matches abbreviations from play descriptions. A real
Bo Nix rushing touchdown was checked against both public sources: its missing
Sleeper ESPN ID resolves to the correct Sleeper QB through this path.

Sanitized NFL data is stored in `nfl_live_games`. The capture RPC serializes each
game's baseline and prevents baseline plays from becoming eligible later.
Eligible events expire after three minutes; stale snapshots lose red-zone claims
after 150 seconds. The read RPC returns a small recent-event slice rather than
whole game histories. Both RPCs use invoker permissions; clients can read the
sanitized public feed but cannot capture, mutate data, or read capture keys.
Retention removes data after 30 days.

The worker runs once per minute. It stops polling a finished game after a short
retry window. Visible live views reuse their existing refresh loop at 20 seconds;
non-live and background behavior retains the normal cadence/suspension. The
browser shares one 20-second cached NFL-feed request across views. Scoreboard
and player-history caches remain independent. Updates follow provider timing and
are not guaranteed to match a TV broadcast instantly.

Pushes use the existing Matchup moments opt-in, current starting lineups and
member ownership. One member/play source key deduplicates stacked players,
multiple devices and concurrent delivery. The sender rechecks the verified event,
freshness, targeted member and category before recording or pushing it. Alerts
route to the exact Clubhouse matchup. Bench players and saved category opt-outs
are respected. No existing opt-outs are overwritten.

## Verification

- `pnpm check`: 2,114 unit tests, release/theme/name/type checks and production
  bundles; 83 application modules, with unchanged three startup/four Home counts.
- 73 production-component browser checks, Light/Dark at 320/390px: offensive
  possession, field context, expansion reversals, stable marker DOM, real
  touchdown/big-play presentation, quarterback/opponent attribution, duplicate
  suppression, stale/baseline handling, native-modal visibility, reduced
  motion and teardown. [Checks](live-football-1475/checks.json).
- Isolated PostgreSQL 17 checks cover durable baselines, fresh versus stale/future
  events, week isolation, read RPC output, read-only client grants, capture-key
  privacy, RLS and invoker permissions. Production baseline/read tests used a
  rolled-back transaction; the public REST read returned 200 and unauthenticated
  worker requests returned 401.
- Original Edge Function sources pass Deno checking. The deployed worker is a
  bundled JavaScript derivative of those sources. The existing production SDK
  JSONB notification opt-in test passes.
- Focused existing Home mount, Clubhouse center and GameDay watch integration
  checks pass, as do compact Clubhouse and record/art regressions.
- Backend: live-football v2, send-notification v14. Authenticated production dry
  run returned 200, inspected 11 games, verified a recent play and sent no alerts.
  The initial scheduler binding was corrected before enabling the job. Delivery
  is activated only after the verified frontend release is published.

Reviewed actual [Light red zone](live-football-1475/red-zone-light.png),
[Dark red zone](live-football-1475/red-zone-dark.png),
[Light touchdown](live-football-1475/touchdown-light.png) and
[Dark touchdown](live-football-1475/touchdown-dark.png) screenshots.

Physical iPhone/Safari frame pacing, native notification presentation and actual
phone delivery remain unverified. Browser fixtures and dry runs send no league
notifications. Provider delays, missing/corrected attribution and opted-out or
unavailable push devices can prevent an alert; the app never substitutes a
fantasy-score jump for a confirmed touchdown.
