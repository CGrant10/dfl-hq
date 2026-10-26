# Connected matchup highlights — 1.476.0

The live-football worker now archives fresh verified touchdowns and big plays in
the existing read-only `gameday_moments` history before sending their alerts.
Only submitted weekly starters qualify. A passer/receiver stack produces one
highlight per roster and NFL play; opposing owners can each retain their own
involvement. Saving does not require notification opt-in. Existing opt-outs and
notification source keys remain unchanged. Historical/baseline plays are not
backfilled or announced, and no fantasy points are inferred from an NFL play.

An archive row retains the official play time, quarter, clock, yards, description
and structured player roles. Its league/season/week/event key is unique;
conflicting retries leave the original saved row intact. The existing NFL cache
can expire independently of the permanent matchup history. The migration only
extends the allowed moment kinds and adds an index for matchup pagination;
read-only browser grants and RLS remain authoritative.

Clubhouse's selected matchup has a compact three-highlight preview, with the
existing swipeable recap behind each row and Play recap. Notifications link to
the exact saved event in their season, week and matchup. If the requested play
is outside the latest page, the view reads that exact scoped key separately.
Missing or failed lookups show a retry rather than opening a different event.
Closing an alert does not reopen it on refresh. A bounded reel includes the
requested older play; ordinary openings start at the first frame.
Choosing another matchup clears the previous alert's play parameter. A pending
final-share read cannot open an export after closing or switching the matchup.

GameDay's existing Moments tab also renders verified plays and opens them in
the same recap. Sharing a play reuses the existing clean/photo export chooser,
including selectable involved players, official yards/clock and play text.

A completed matchup closes with actual final scores, the highest-scoring starter
across both teams and existing result-based banter. When the last saved lead
change agrees with the final winner, it appears as **Last saved lead change**.
It retains its observed scores and is not attributed to an unrelated NFL play.
Missing observations and ties omit that turning-point detail. The existing final
share card includes it when available. Current team names remain authoritative.

## Verification

- `pnpm check`: 2,128 tests in 257 files, release/theme/name/type checks and
  production build passed. Bundle remains 83 modules / 3 startup / 4 Home.
- 85 new production-component browser checks at 320/390px in Light/Dark:
  exact older-play alert, source facts, compact list, current names, existing
  clean/photo share export, default reopening, keyboard focus return, other
  matchups, interrupted reads, error/retry, missing-event behavior, refresh
  cadence, hidden-tab recovery, reduced motion, short screens and teardown.
- Original recap's 64 browser checks and focused Home, Clubhouse and native
  GameDay integration checks passed. Fixtures were updated for the production
  controllers' new explicit imports. No fixture sends league notifications.
- Isolated PostgreSQL 17 checked the migration, duplicate suppression, preserved
  history, existing lead events, anonymous reads and denied client writes.
  A production read/write-permission check used a rolled-back transaction and
  confirmed that no verification row remained. No related security advisories.
- Original worker TypeScript sources pass Deno checking. Deployment uses bundled
  JavaScript derived from those sources; the updated sender accepts existing
  matchup-only links and validates new exact-play targets against saved history.
- New source modules are included in the offline app-shell graph.

Reviewed actual [Light play](matchup-highlights-1476/play-light-320.png),
[Dark play](matchup-highlights-1476/play-dark-390.png),
[Light final](matchup-highlights-1476/final-light-320.png) and
[Dark final](matchup-highlights-1476/final-dark-390.png) captures.
[Browser checks](matchup-highlights-1476/checks.json).
Portraits in these isolated screenshots are local image fixtures. Physical
iPhone/Safari frame pacing and actual phone notification delivery are unverified.
