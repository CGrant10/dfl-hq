# Live Sportsbook result marks — 1.480.0

Fantasy matchup lines and individual ticket picks show a green check for a hit,
a red X for a miss, or a neutral push mark as soon as both starting lineups have
confirmed final NFL statuses. This can happen Sunday while unrelated teams still
have Monday players. Benches do not delay the result. Unknown/missing players,
NFL status, scores, truncated lineups, wrong weeks or stale evidence cannot claim
a finish. Team identity uses stored Sleeper roster IDs, independent of renames.

The result reader uses the existing public league metadata, compact player cache,
weekly Sleeper rosters and matching ESPN week status. Results load after the page
renders, refresh every 30 seconds while visible and on foreground, and pause
around account writes. One request group serves all matchup lines in the same
week. Player metadata retains its five-minute lifetime. No new backend tables,
cron schedules, settlement functions, payouts or push notifications.

These marks are live results, separate from Tuesday's authoritative settlement.
Pending tickets retain their official open status and do not credit SIN early.
The UI and image label grading as pending; misses display an estimated return of
zero, ties display a pending stake refund, and winners retain the prospective
return. Already settled leg statuses take priority. Missing evidence clears the
provisional result. Ordinary provider-line grading remains intact.

Shared cards use the same leg results, explicit Hit/Miss text and vector marks.
Both clean and photo styles use legible semantic green/red. All six allowed
picks are visible in the compact export, including a losing sixth leg. Larger
legacy entries still count omissions and retain the full export. Missed/push
entries do not continue advertising potential profit. Sharing rechecks result
evidence through the same read-only loader.

Validation: full `pnpm check` passes 2,164 tests / 262 files, including new evidence,
identity, Sunday/Monday, mixed parlay, tie, stale/missing data, official settlement,
refund/estimated return and refresh lifecycle tests. Final theme check and build
pass (85 modules / 3 startup / 4 Home). The production-controller browser harness
passes 44 checks in Light/Dark at 320/390px, with 12 inspected app/share screenshots
and real result loading/foreground refresh against isolated providers. Existing
bet-slip review passes 18 layouts without writes or errors.
[Checks and screenshots](sportsbook-results-1480/checks.json).

Production read-only inspection confirmed the existing Tuesday settlement schedule,
public league read privileges and cached K/DEF metadata. Physical iPhone/Safari
frame pacing and real game-time stat corrections remain unverified. No test bets,
wallet changes or member notifications.
