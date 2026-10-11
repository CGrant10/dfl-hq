# Advice receipts — v1.373.0

Team Analyzer shows the selected team's calls from the last three weeks. Completed Clubhouse recaps show the selected week's calls across the league. Each compact receipt preserves its pregame projection, lineup and scoring settings, then compares the changed players' actual points. Hits, misses and pushes all remain visible. A miss roasts DFL HQ, never invents a manager's actions.

## Recording

The protected `roster-advice` worker uses the existing Vault cron token, auto-sync switch and regular-season checks. It verifies the current twelve-team full-PPR/one-QB league, current rosters, submitted starters and NFL slate. It reads fresh Sleeper weekly/season projections, previous/current production, completed weekly results and player metadata. Expert rankings use the same assessment and player-value model as Analyzer; an unavailable or stale expert feed is excluded.

Start/sit snapshots come from the existing `startSitAdvice`, with an additional legal-lineup check, IR/taxi exclusion and verified kickoff locks. Waiver snapshots use the existing `buildWaiverPlan` protection and gain rules. Only current-week upgrades are recorded; speculative future-week offers do not become current-week receipts. The comparison is against the saved best legal lineup, not the raw score of the dropped bench player. Already locked players remain fixed.

One roster is reviewed per ten-minute poll, rotating by oldest review. At most one lineup call and one waiver call are saved per team/week. The first eligible snapshot is immutable: a unique key and ignore-duplicates insertion prevent later projections, retries or concurrent workers from rewriting the call. New snapshots require a positive gain and at least a minute before the earliest changed player's kickoff. A verified no-game starter can be replaced and later counted as zero. No historical advice is backfilled. Capture does not depend on opening the app or turning notifications on, and sends no notifications.

## Grading

Grades wait for the entire verified NFL slate to finish, at least four hours after each kickoff, and require final NFL status for every changed player. Actual stats use the scoring settings stored with the call. Common lineup players cancel out. A published zero or negative score is valid; missing, malformed or stale stats remain pending instead of being silently counted as zero. A no-game zero requires the pregame record's explicit no-game flag.

Differences above +0.5 are hits; below -0.5 are misses; the small interval between them is a push. Pending and invalid records never contribute to hits/misses. Grades are recomputed when read or refreshed so stat corrections update the result. This is an observed lineup comparison, not a claim of calibrated model accuracy, added team points, a completed pickup or a manager following advice.

## Storage and access

`roster_advice_receipts_schema.sql` adds two tables containing public league calls and review timestamps. Both use RLS with explicit public read policies. Browser roles have SELECT only, with no insert, update, delete or identity-sequence permission. The protected worker's service role is the sole writer. There are no new public RPCs, SECURITY DEFINER functions, member identities, credentials or private behavior logs.

Deploy `supabase/functions/roster-advice/index.ts` with its relative dependencies after the table patch, then apply `roster_advice_schedule_schema.sql`. The ten-minute cron reuses the existing Vault URL/token and football-season Chicago-hour controls. Unschedule `dfl-roster-advice` to stop capture. Existing injury and matchup notification workers are unchanged. `{dryRun:true}` returns the candidate review without any insert or notification.

## Verification

Unit coverage exercises legal lineups, slot reconstruction, locks, protected drops, ownership/IR/taxi, frozen projections/scoring, misses, near-ties, verified byes, zero/negative scores, missing stats, stat corrections, invalid pregame evidence, team/week query boundaries, stale/failing sources and refresh. Full project type/name/unit/build checks and the Deno worker check pass.

Live backend verification includes authenticated dry runs, rejection of an unauthenticated request, RLS/role grant checks and a rolled-back duplicate insert proving that the first projection survives. Advisor results introduce no new findings. Browser checks use read-only requests and intercepted fixtures for hits, misses and pending calls; no fixture advice is stored in production. They cover Analyzer, team switching, failures/retry, focus and disclosure preservation, completed recaps, and 320/390/768 px layouts. Open disclosure and refresh-focus state also survives a remounted weekly panel, scoped to the team/week.
