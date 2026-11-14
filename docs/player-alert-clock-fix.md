# Live player alert capture clock

The live-football worker compared freshly captured database feeds against the
clock sampled before its provider/DB requests. `capture_nfl_live_game` stamps
`fetched_at` after that clock. Both `footballNotificationDrafts` and
`footballMomentRows` correctly reject negative feed ages, so the worker discarded
its own new feeds before recording a game moment or calling the sender.

The worker now samples `deliveryNow` after all captures finish and passes that
same clock to both consumers. Candidate enrichment also uses the clock after
the summary arrives, so a play occurring during that request is eligible for
the current poll. The three-minute play window, feed freshness, baseline,
member ownership, opt-out, deduplication and exact destinations are unchanged.

Production checks on 2026-11-14 found an active minute scheduler, enabled
subscriptions with the player-alert category, no device failure flags, and
recent successful delivery in other categories. No `weekly:play:` inbox rows
or saved NFL game moments existed. The deployed v6 bundle reproduced the bug:
six of nine worker integration scenarios failed. All nine pass against the
fixed source and the actual deployment bundle, including passing/rushing TDs,
big plays, in-flight arrivals, expired plays, opt-outs, baselines, retries and
a write-free dry run. Provider, database and push I/O in these tests is mocked;
the parsing, targeting and freshness helpers are production implementations.

Validation: 76 targeted notification/football tests, Deno source/bundle checks,
type/name/release checks. No UI or schema change; frontend release stays 1.579.0.
The compiled worker differs from production v6 only at these clock handoffs
and the bundler's empty export. Bundle SHA-256:
`b5c605477376e0c184d23a98b051cdda16c4073d0db47dc44185480669b027ca`.
Evidence: `/workspace/dfl-notis-1580/`.

No historical plays are replayed and no test push is sent to real devices.
Protected production dry-run/normal scheduler health checks can verify the
deployment without fabricated league activity. End-to-end physical phone
delivery needs the next fresh, rostered live play; it cannot be confirmed
while the NFL feed has no live games.
