# Connected app reliability · v1.368.0

The existing Home briefing now reads the same fresh, legal-lineup pickup and injury-backup model as Team Analyzer. Advice points to the selected owner, labels its check time, refreshes while visible and catches up after reconnecting. A refresh failure replaces the prior recommendation with an Analyzer refresh action. Tab selection and focus stay in place.

## Background football data

The protected `sync-sleeper` worker accepts an adaptive invocation from a five-minute cron dispatcher. ESPN's existing server-compatible scoreboard selects five-minute live sync, fifteen-minute pre-kickoff/results sync, or hourly roster sync during the active regular season. Database compare-and-update claims prevent overlapping adaptive runs. Adaptive sync validates complete league data, captures shared matchup moments, updates current names/rosters/transactions/scores, and reconciles previous-week scores during hourly checks. Existing commissioner schedule slots still perform full reports and sportsbook setup. Adaptive runs do not send routine commissioner notifications or re-price markets. Sleeper corrections appear after the provider publishes them; this is polling, not a real-time scoring feed.

## Wall delivery

`The Wall` is a separate device preference, off by default and absent from existing saved preferences. The All preset deliberately opts in. Database triggers queue only new replies/mentions for devices already opted in at message creation. Existing inbox behavior and exact-thread deep links remain.

Each message/device delivery has an atomic `SKIP LOCKED` lease and at most five attempts. The cron worker checks current opt-out, audience membership and 24-hour expiry again before sending. Transient provider failures back off; 404/410 disable expired endpoints. Successful devices are never retried just because another device failed. Like most external push systems, delivery is at least once if the worker crashes after a provider accepts a push; the stable message tag and quiet Wall replacement avoid a second buzz from a retry. Phone permission and OS delivery behavior still apply.

No production test messages were sent. A database transaction exercised opted-in/off/wrong-category devices, claim leases and anonymous access isolation, then rolled back every fixture. Protected worker dry runs checked all 12 real rosters and 12 matchup rows and returned zero pending Wall messages.

## Diagnostics

Every session can report bounded, deduplicated technical categories: request failures, broken images, runtime/unhandled errors and delayed score refreshes. The reporter sends only route category, source category and release. It never collects messages, errors, stacks, URLs, member IDs or a persistent browser identifier. Offline failures are ignored and reporter failures do not recursively report themselves. A commissioner-only reliability summary joins these signals with background sync and Wall queue health on the existing Performance panel.

New tables have RLS and no anonymous table grants. Queue claims are security-invoker, service-role-only. The two public definer RPCs are intentional: an allowlisted, rate-limited anonymous telemetry writer and a commissioner-permission-gated summary. Supabase advisors flag those patterns generically; privilege checks and denied unauthenticated summary calls verify the intended access. Private trigger functions have no public execute grants. Thirty-day retention removes diagnostic events and completed/exhausted queue entries.

## Verification and rollback

Frontend unit checks cover cadence, opt-in/recipient isolation, expiry/retry limits, reporter privacy/cleanup, fresh briefing precedence, stale/wrong-week suppression and quiet push replacements. Full app checks cover offline startup imports, mobile layouts, Home/Watch/Clubhouse catch-up, Analyzer switching, current archived receipts, selected week tabs, settings rendering and Wall deep links. Production dry runs do not claim jobs or write sync data.

Disable cron jobs `dfl-sleeper-live-sync` and `dfl-wall-alerts` to pause these workers. The existing Sleeper automatic-sync switch also pauses adaptive football data. Reverting the frontend retains saved device preferences and existing inbox/history data. Existing full scheduled Sleeper sync remains available.
