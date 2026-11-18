# Player context in trade values — 1.601.0

Coleman's expanding role was still anchored too heavily to a 63.9-point season
projection. Brown had his own injury adjustment, but no explicit signal for a
new injury setback or the newly unavailable starting quarterback. The exact
straight swap was already below Fair on the checked inputs; it was not
reproduced as a Fair offer.

## General rules

- Sustained opportunity requires five current-season appearances, three recent
  games with known usage, and at least two earlier appearances. RB opportunity
  is targets plus 0.35 carries; WR/TE opportunity is targets. Expansion requires
  a 40% mean increase and 30% median increase, with at least six opportunities
  per game. An RB also needs current, team-matched RB1 depth-chart evidence.
  Contraction requires mean usage below 65% and median below 75% of an earlier
  role of at least six opportunities per game.
- Only a materially obsolete point forecast is rebased: recent production must
  differ in the same direction by more than 1.5 points and 15% of baseline.
  In that case the current-season weight becomes 85%, with 65% recent form
  inside it. The separate usage bonus is disabled to avoid double counting.
  Otherwise the existing modest usage correction remains. One touchdown spike,
  missing usage, and unverified RB depth cannot establish a new lead-back role.
- A setback requires current-season, exact name/team/position ESPN news no older
  than 14 days, an injured status, a reported return after an absence, and a new
  injury/reinjury. Conditional and negated claims are rejected. Underperforming
  players with at least three appearances shift toward observed production
  (80% current-season weight); a setback alone never raises the forecast.
- QB context uses completed passing attempts on the player's current NFL team,
  not a receiver's former team or an injured backup. An established passer must
  lead at least two of the last three games and have at least 40 attempts in
  those games. A dated report within 14 days must show Out/Doubtful/reserve.
  A later full passing workload or healthy report clears the signal; after two
  replacement-led games, observed form takes over rather than retaining a
  second adjustment for the same quarterback change.
- WR/TE forecasts receive an 8% temporary downside stress adjustment while that
  QB context is unresolved, and affected player value ranges widen. **This is
  a bounded model assumption, not an empirically calibrated loss estimate or
  a medical prediction.** RB rushing output and QB market premiums do not get
  this receiver adjustment. Exact injury diagnoses and absence lengths are
  never inferred from a feared fracture or an estimated return date.
- Context risks enter suggestion ordering, confidence and Steal blockers.
  Default league-wide Best searches remove offers that add context risk with
  no more than 0.2 projected starter points/week of gain. Explicit targets,
  team searches and manual checks remain available for buy-low negotiations.
  Shared offers and saved proposals notice semantic context changes even if
  rounded prices and the player's own injury tag stay equal.

These use existing Sleeper production, current depth-chart facts and ESPN
injury inputs, without another client request or paid source. FantasyPros PPR
ROS ranks still anchor prices with their existing freshness/spread controls.
No player names, ages or reputations set premiums or penalties. Existing
1QB/12-team/flex replacement, ownership, handcuff and trade-routing safeguards
remain; frozen completed receipts are not rewritten.

## Current-league verification

Read-only November 18, 2026 snapshot: season 2026, week 11. Both before and after
use the same fresh five-expert FantasyPros feed. Coleman is DEN RB1; Brown and
Maye are NE. ESPN reports Brown's new hamstring injury after a two-game absence
and Maye expected to miss time. The ankle fracture remains unconfirmed in that
report, so the UI uses the sourced availability status instead of a diagnosis.

| Checked result | Before | After |
| --- | ---: | ---: |
| Coleman forward PPR points/game | 9.55 | 13.16 |
| Coleman quoted value | 14 | 22 |
| Brown forward PPR points/game | 8.89 | 6.46 |
| Brown quoted value | 11 | 11 |
| Coleman for Brown price balance | 79% | 50% |
| Your projected starter gain | 0 | 0 |

Brown remains at the model's low production-value floor while the expert
anchor retains a price of 11; the change does not fabricate an extra expert
rank downgrade. Historical points earned do not change. His evidence now
includes Injury setback and QB change; Coleman's includes Rising role.

Public NFL-only regression facts are recorded in
`tools/fixtures/player-context-2026-11-18.json`; they are test data, never a live
valuation source. Coverage includes backup/old-team injuries, old/future news,
healthy clearance, replacement starts already observed, one-game workloads,
unknown usage, already-current forecasts, hypothetical/historical setbacks,
unchanged earned points and sharing/saved-deal context changes.

Mobile evidence at `/workspace/dfl-qb-context-1601/ui` covers 320/390px,
Medicine Wheel Light/Dark and 16/32px root text. Production trade markup shows
the compact context rows, one-line names, no horizontal overflow, readable
text contrast and no page errors. Actual-league before/after reads and release
verification are in the same task directory. Native device animation timing
and medical/projection calibration are not claimed by these checks.
