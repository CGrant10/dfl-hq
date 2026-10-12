# Installed-app release discovery and cache repair — 1.382.0

`version.txt` remained at 1.373.0 while the published HTML, JavaScript release
floor and service-worker cache reached 1.381.0. Existing clients on 1.379.0
therefore saw an older server marker and never displayed the update prompt.
Fresh-browser asset checks did not cover installed-client release discovery.

A second regression reproduced a new version label loading older trade code:
the worker populated its new app cache from still-fresh HTTP-cache responses.
Explicit asset refreshes also returned the old app-cache response immediately.
The new worker revalidates HTTP entries before precaching. A retired worker's
late request can recreate its old cache after activation; local app responses
now come exclusively from the current release's cache, preventing those older
entries from leaking into the new app. Update navigation
and explicit reload/no-cache/no-store asset requests wait for network freshness,
with a type-checked cached fallback when offline. Ordinary requests retain the
existing fast cached response with background revalidation. Revalidation can
reuse unchanged HTTP responses; it does not change football-cache expiry rules.

An older updater can reload after five seconds while a replacement worker is
still installing. The inline HTML guard now asks the controlling worker for its
release and defers all app-module imports until that release matches the HTML.
Current clients can boot from their verified worker offline. A failed/stalled
replacement shows an actionable retry state instead of booting older app code
under new metadata. Startup retains its loading state while activation finishes.

The discovery marker and all app versions now agree at 1.382.0.
`pnpm release:check` verifies package.json, version.txt, HTML release metadata,
config's release floor and the worker's app-cache version. `pnpm check` runs this
guard first, so forgotten markers and inconsistent release identifiers fail CI.

Read-only browser fixtures run the real 1.379 service worker/update module and
version calculation with service workers enabled. They cache and reload the old
shell, switch server assets, reproduce the stale-marker failure, repair the
marker and click the actual Update Now control. Ordinary, warm ten-minute HTTP-cache and deliberately slowed installation
scenarios load the current position/flex trade
model and scroll controller after updating. The warm-cache case failed before
the worker fix despite displaying the new release label. Activation retires only old app caches; any cache recreated by a late old-worker
request is excluded from local app responses. Synthetic saved drafts/preferences, football caches and
the worker registration survive; there are no real league writes or login tests.
Artifacts are in `/workspace/dfl-update-1381/`.

Startup regressions cover current/offline workers, imports remaining paused past
the older five-second timeout, failed updates and a bounded stalled update.
Worker regressions cover the release handshake, fresh install requests, explicit
refresh modes, fast
ordinary module requests, offline typed fallbacks and navigation/push behavior.

Validation passed: type/name checks, 1,578 tests across 184 files and the
production build. The actual Home, Analyzer and Trade pages booted correctly at
320/390/1024px with league writes blocked. Native-worker browser checks cover
ordinary caches, warm HTTP caches and a deliberately delayed model download;
the delayed case exposed the retired-cache race and now loads the current code
while preserving saved state. Startup and cache regressions also cover offline
and failed-update behavior.
