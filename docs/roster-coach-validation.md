# Roster coach — v1.367.0

## Behavior

- Team Analyzer checks fresh Sleeper league settings, all 12 rosters and this week's submitted starters before recommending available players. Ownership includes IR and taxi players. Kickoff status comes from the NFL scoreboard.
- Pickup/drop pairs maximize a legal nine-slot DFL lineup: 1 QB, 2 RB, 2 WR, TE, RB/WR/TE flex, K and DEF. Already locked starters remain fixed. Current and the next two published projection weeks use the league's own scoring settings. Missing or stale source data is withheld.
- Starters, IR/taxi players, highly valued bench players and top positional assets are protected from drop suggestions. Each pair must improve a lineup by at least 1.5 projected points, without costing more than 1.5 in another available week. Streamers cannot flood the shortlist. One recommendation is expanded; alternatives are available in More pickups.
- The current league uses priority waivers. Conservative FAAB ranges appear only if Sleeper settings change to FAAB, and stay within the actual remaining budget. They are guides, not forecasts of winning bids.
- Home, GameDay Watch and Clubhouse lineup checks identify healthy, slot-eligible bench backups whose games have not started. Questionable starters favor backups playing at the same time or later. Out starters take priority, and a backup is not promised to two affected starters. IR/taxi and unknown kickoff eligibility are excluded.
- A protected background worker checks every ten minutes during football-season daytime/evening hours. It sends targeted Matchups notifications only in the 90 minutes before an affected starter's kickoff. Questionable and Out each receive one source key per player/week/owner; duplicate keys use the existing unique index. Push expires at kickoff and the device worker rejects expired payloads. Notification preferences and the existing auto-sync enable switch remain authoritative.
- Live targets use actual matchup scores and known player states. When both teams still have players, they show required net scoring rather than presenting the current deficit as a fixed winning target. Finals and unavailable status do not receive a live forecast.
- Completed Clubhouse weeks add factual bench, blowout and narrow-escape roasts to the existing recap/share text. Single-swap receipts require a complete current-season submitted lineup, known scores and direct slot eligibility; their numbers are explicitly hindsight because historical kickoff availability was not recorded. Historical seasons retain score-based roasts.

## Verification

- Full `pnpm check`: type checking, unresolved-name check, unit suite and production build.
- Deno checks for both notification functions, using system CA trust and pinned existing SDK dependencies.
- Read-only actual-app browser verification: 66 checks across Home, Watch, Clubhouse, Team Analyzer and the completed weekly recap; 320/390/768px layouts, team switching, refresh/focus preservation and offline/reconnect. Zero browser exceptions or horizontal overflow.
- Existing Watch/Clubhouse fixture checks: compact pinned scoreboards, paired lineups, selected-game phase, touch targets, motion preferences and lineup status.
- New unit coverage includes ownership/IR/taxi exclusions, legal flex allocation, 1QB scarcity, missing projections, locked games, bye coverage, protected drops, budget limits, duplicate QB alternatives, alert windows/escalation, postponed games, score targets, historical eligibility and device expiry.
- Supabase checks use authenticated dry-run requests and an already-expired message with an empty recipient list. No test notifications are sent to league members. A dry run verifies live provider, roster and injury parsing; expired delivery returns success with zero messages created.

## Operations

Deploy `lineup-alerts` with its repository-relative JS dependencies (listed in its imports), and deploy `send-notification` with the expiry change. Both use existing custom authentication. Apply `lineup_alert_schedule_schema.sql` after the frontend release is live; it reuses the existing Vault sync URL/token and creates no new public RPC or member permissions. Unschedule `dfl-lineup-alerts` to stop the worker. The public scoreboard endpoint matches the existing sportsbook server worker, since the browser ESPN endpoint rejects server requests.
