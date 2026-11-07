# Rostered player alerts — 1.557.0

The existing automatic live-football worker now alerts enabled members for
verified offensive touchdowns and big plays from their current Sleeper roster,
including bench players. Current roster ownership takes precedence over stale
weekly matchup rows after a trade. Unsupported positions/roles, other weeks,
stale/future/unverified plays and ambiguous ownership cannot notify.

A big play remains 20+ rushing/receiving yards or 40+ passing yards. A stacked
passer/receiver play creates one member/play notification. Bench involvement is
labeled in the push body, in-app alert, saved receipt and shared receipt. Saved
plays contain NFL yards/clock, never invented fantasy points or a bench score.
The exact saved moment/available-video destinations and sender verification
remain unchanged. The preference is labeled “Player & matchup alerts” and keeps
its existing category ID, defaults and saved opt-outs.

Home/Clubhouse/watch effects include the selected profile’s roster even while
another matchup is selected. Other teams’ bench players are not celebrated.
Red Zone Watch stays scoped to starters. Existing shared polling, stale-event
baselines, finite animations and teardown remain in place; no new browser or
backend poller, subscription category, provider or database schema.

Validation: pnpm check passes 2,486 tests, release/theme/type/name checks and
build. App bundles retain 88 modules, three startup and four Home modules.
The 85-check real-component mobile suite passes in Light/Dark at 320/390px,
including bench labeling, bounds, deduplication, Reduced Motion and native
dialogs. Actual Light/Dark bench alert screenshots reviewed. Source workers
and the deployed JS derivative pass Deno checking; the production SDK JSONB
opt-in filter test passes. No test alerts were sent to members.

Production live-football v6 retains custom private scheduler authentication and
the existing active every-minute cron. An authenticated production dry run
returned HTTP 200 with no live games; it sent no alerts. Phone delivery requires granted device
permission and the enabled category; saved opt-outs remain authoritative.
Real phone push arrival and physical iOS frame pacing remain unmeasured.
