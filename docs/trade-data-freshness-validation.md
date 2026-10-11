# Trade data freshness — 1.378.0

The valuation remains a combination of FantasyPros PPR rest-of-season ranks and
DFL-scored player production, projections, recent form, consistency, availability
and positional replacement. Fresh matched expert ranks have a bounded 15%
influence, including the existing one-QB scarcity discount.

## Updates

- Check the public expert source every two hours instead of six. GitHub schedules
  can be delayed; this is the requested check cadence, not a provider update SLA.
- Recheck published expert snapshots after 15 minutes while fresh, or five
  minutes when unusable. Explicit final trade checks bypass that memory cache.
- Cache current-season production and weekly availability for five minutes
  instead of 30. Final trade checks bypass both caches and retain current roster
  and league-setting verification. Previous-season stats and large season market
  projections retain their existing caches for mobile efficiency.
- Explicit zero-age Sleeper reads also revalidate the browser's HTTP cache.
- Block final sharing when current production cannot be verified. A failed
  expert reread requires review rather than claiming the cached opinion was
  verified against the latest publication.
- Require another review when confidence changes, even if rounded prices and
  the Fair category do not change. Shared receipts use the refreshed model.

## Source integrity

An upstream consensus older than 72 hours remains excluded. A successful source
check does not make its opinions newer: stale sources produce a warning and
preserve the prior file and source date. Invalid or regressed payloads fail.
Identical opinions do not create a commit or trigger a site rebuild solely to
change the download timestamp. New valid facts publish atomically; publishing
rebases the snapshot commit on current main before pushing.

## Verification

Regression coverage checks normal refresh intervals, forced expert rereads,
unavailable forced reads, current production/availability cache bypass, failed
production verification, changed confidence with unchanged prices, unchanged
source facts, atomic publication, stale-to-fresh recovery, and invalid/regressed
sources. A browser run with actual league data confirms fresh current-production
and availability requests plus both expert snapshot reads during the final
recheck. All browser verification blocks league writes.

The public FantasyPros source was still older than 72 hours during validation.
The refresh job and app correctly report this; no source timestamp was invented.
