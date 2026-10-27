# Thursday highlight rollover — 1.491.0

Home, Clubhouse, team highlights and NFL-linked clip availability share a single
Thursday 06:00 America/Chicago cutoff. The preceding Thursday–Monday games remain
in the current reel on Tuesday and Wednesday; the next Thursday opens a fresh
edition and rejects cached prior-week footage. Publisher restrictions can still
expire individual clips earlier. Existing chronological ordering is unchanged.

The database retention constraint and deployed game-highlights/live-football
workers use the same cutoff. Existing private scheduler authentication, RLS,
read-only browser access and expiry cleanup jobs remain in place. No notification
preferences or actual test push deliveries were changed.

Validation: full release, theme, type, identifier, unit and build checks pass.
Boundary cases include Tuesday/Wednesday retention, exact Thursday rollover and
both daylight-saving changes. The mobile reel harness passes 182 checks across
320/390 Light/Dark, including preserving an open player through Wednesday and
stopping/releasing video at Thursday expiry. Rolled-back production inserts
verify all five game dates across normal, spring and fall weeks, rejecting even
one second past the cutoff with no fixture rows left behind. Security advisors
report no highlight-table findings. The production collector returned 200 with
14 games, 53 playable clips, 35 linked plays and no provider failures. Its session
cutoff is 2026-10-29 11:00 UTC (Thursday 06:00 Central); publisher expirations are
earlier for some clips.
