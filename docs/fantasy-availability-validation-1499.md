# Fantasy updates and trade availability — 1.499.0

Latest Updates now compares named QB/RB/WR/TE players only. A player must be
rostered or have at least three projected/recent points (including the previous
snapshot). Defensive players, offensive linemen, kickers, punters and irrelevant
zero-projection depth do not create these updates. Injured rostered offensive
players remain relevant. This changes the Home digest, not historical statistics.

Automatic trade suggestions exclude current IR/PUP, inactive, retired, suspended
and season-ending players in Fair, Aggressive, Steal, anchored searches,
refinements, package edits and multi-team searches. Temporary IR is not treated
as proof of a season-ending injury; it is still excluded from automatic offers
until reserve status clears. Manual trade checking and completed trade receipts
continue to support injured players.

The existing cached ESPN injury feed now retains comments and structured return
dates. Matching requires normalized name, NFL team and position, uses the latest
current-season injury row, and rejects future timestamps. Explicit season-ending
news or a reserve return estimate beyond the NFL regular season sets future
production and trade value to zero. Healthy current status prevents old injury
notes from declaring a season over. Missing secondary injury data never makes
catalog IR eligible for automatic offers. A null weekly injury placeholder cannot
clear catalog IR. Already earned points remain in historical/current totals;
future-week and expert-rank blending cannot restore future value.

Client analyzer data and new server-side completed-trade receipts use the same
availability helper. Existing saved receipts remain immutable; the routing model
version, schema, notification preferences and duplicate-delivery keys are unchanged.
Both scheduled trade-watch and manual sync-sleeper bundles include this rule.
No production test transactions or test pushes were created.

Validation:

- Full release, theme, TypeScript, names, test and production build checks.
- Focused tests cover short-term/season-ending IR, current healthy status,
  conditional news, exact matching, stale rows, absent storage, offensive update
  relevance, zero future values, manual checks and two/three-team suggestions.
- Mocked backend integration grades a newly synced trade using the same ESPN
  evidence; its notification provider and receipt database are isolated fixtures.
- Actual compiled browser worker: 30 healthy Fair, 30 Aggressive, 30 Steal and
  27 three-team fixture offers; zero unavailable players included.
- Existing Trade browser harness passes at 320/390/768 with no page errors or
  horizontal overflow, including rechecked injuries and sharing safeguards.
- Read-only current catalog/ESPN probe: 98 offensive catalog IR/PUP players,
  zero automatically eligible; five matched current season-ending injury records.

No colors, typography, spacing or motion styles changed. Installed-device cache
refresh and upstream correctness of estimated injury return dates cannot be
proven by these automated checks.

Deployment checks: trade-watch version 2 and sync-sleeper version 21 are ACTIVE
with their existing custom authentication. Both reject unauthenticated requests
with HTTP 401. Authenticated trade-watch dry run returned HTTP 200 for 2026 week
8, four completed trades and no pending work; dry runs do not create receipts,
claim watcher state or send notifications.
