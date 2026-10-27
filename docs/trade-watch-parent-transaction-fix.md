# Independent trade alert repair — 2026-10-27

The two-minute trade watcher detected Sleeper transaction 1420919848032100352,
completed at 21:27:39 UTC, but its 21:30 invocation failed with PostgreSQL 23503.
The receipt references `sleeper_transactions`; only the full sync previously
persisted that parent. The independent watcher was therefore able to find a
trade but unable to record or notify it before a full sync happened.

The watcher now upserts completed trade ledger rows before invoking receipt
grading/delivery. It uses the existing transaction schema and unique Sleeper ID,
retains raw provider details, and records the provider/ledger week at rollover.
Failed parent writes stop receipt creation and preserve a readable retry error.
Dry runs remain read-only. Already delivered trades still skip roster/model and
ledger work. No schema, client UI, notification preferences or two-minute cadence
changed. The existing unique notification source key still prevents duplicate
alerts if a full sync and watcher overlap.

Tests enforce the missing parent constraint in the watcher fixture, verify the
actual parent row shape/order, previous-week handling, idempotent upserts,
read-only dry runs and failure/retry diagnostics. The focused watcher/receipt
suite passes 26 tests. No fake production transaction or test notification was
created; production verification observes the scheduled handling of the user's
real completed trade.

Production verification: deployed trade-watch version 3. Its normal scheduled
21:32 UTC run persisted the missing transaction, created graded receipt 29 and
linked notification 116 at 21:32:06 UTC, clearing the watcher error. No manual
full sync or manual notification request was used. Unauthenticated invocation
continues to return HTTP 401. This is a server-only repair; installed app assets
and client version 1.499.0 do not need an update for the watcher fix to apply.
The matching notification routes directly to the Sleeper transaction's receipt.
Three trade-enabled subscriptions recorded push-service success during that run;
none recorded a failure. This verifies service acceptance, not OS notification
presentation on a particular handset.
