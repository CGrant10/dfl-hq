# Mobile launch performance — 1.477.0

The first-open investigation found three expensive paths: the full Sleeper
player catalog, a live-name lookup on the profile restoration path, and release
activation waiting for every decorative image. Home also began full-league
analysis before its opening matchup had loaded.

## Changes

- A private scheduled worker refreshes a compact NFL directory every four
  minutes. It contains all 12,229 provider players and exactly the nine fields
  already used by DFL, including injury/practice/news and fantasy eligibility.
  A verified public REST read transferred approximately 295 KB compressed,
  versus approximately 2.57 MB for the provider catalog (about 89% less).
  The worker updates only freshness when its content hash is unchanged.
- `loadPlayers` still checks its existing memory/device caches first. The shared
  directory is accepted only within the caller's original freshness requirement.
  Missing, stale, future or malformed data falls back to Sleeper. Explicit
  `maxAgeMs:0` checks still bypass it and revalidate the provider directly.
  Unavailable/full phone storage and corrupt cached JSON cannot strand loading.
- Profile restoration allows 400 ms for optional live-name enrichment, then
  proceeds with verified member rows and the latest available synced names.
  The same background request updates shared rows/portraits when it finishes.
  Epoch checks prevent older requests from overwriting a forced refresh. Known
  Sleeper portraits survive an unavailable feed; a verified removal still clears
  them. General Sleeper reads now have a bounded 12-second request lifetime.
- The worker retains the complete compiled application for offline imports.
  Decorative artwork moves after first-route readiness, with six concurrent
  essential-cache requests and two optional requests. Optional warming starts
  after five seconds, pauses in the background and avoids slow/data-saving
  connections. Already bundled component CSS is not downloaded twice.
  Required activation assets decreased from 151 / 7,959,772 uncompressed bytes
  to 123 / approximately 4,227,345 bytes. All code/style release checks remain.
- Normal cached imports of immutable, release-scoped bundles no longer trigger
  background re-downloads. Explicit update/reload requests still revalidate;
  missing or HTML module responses cannot activate a broken release.
- Home starts its heavier analysis when that section becomes visible or after
  the opening matchup paints. A bounded fallback preserves independent lower
  sections when the live feed is unavailable. The same shared analysis still
  powers advice, rankings and broadcast refinement; scoring logic is unchanged.

## Verification

- `pnpm check`: 2,142 tests / 259 files, release/theme/type/name checks and build.
  Bundle remains 83 modules / 3 startup / 4 Home.
- 11 production-app browser checks load both a plain first-open URL and
  `#/home`, complete the real matchup loader using the compact directory, and
  cover direct force refresh, missing-cache fallback, phone-storage failures,
  mobile width and uncaught errors. Providers and writes are isolated.
  [Checks](mobile-loading-1477/checks.json).
- Focused production Home, Clubhouse and native GameDay integration checks pass.
  Unit checks cover slow/late names, current portraits, stale/future catalogs,
  offline code imports, missing modules, immutable-cache hits, optional artwork,
  background warming and late/unavailable worker registration.
- PostgreSQL 17 verified public column reads, denied browser writes/freshness
  changes, private cache internals, RLS and paused initial scheduling. The
  deployed refresher returned 200, seeded the real catalog, and its subsequent
  automatic run returned 200 with an unchanged content hash. Unauthenticated
  refresh requests return 401; no related security advisories.
- Original worker source passes Deno checking. The deployment is its bundled
  JavaScript derivative; migration version matches production history.

A [single throttled browser sample](mobile-loading-1477/throttled-browser-sample.json)
compared clean 1.476.0 and 1.477.0 contexts with 120 ms latency, 128 KB/s page
download throughput and 4× CPU slowdown. First-route readiness was approximately
10.5 s versus 9.4 s; the new matchup completed at approximately 13.2 s while the
old one was still loading during the capture. This is diagnostic evidence, not
a physical-phone benchmark or a p75 claim. Worker and page traffic do not share
the same CDP throttle, so cumulative transfer totals are not a mobile-bandwidth
benchmark. Provider reads were allowed; verification writes were intercepted.

No visual redesign, valuation changes, permission changes or notification tests.
Physical iPhone/Safari startup and hardware frame pacing remain unverified.
