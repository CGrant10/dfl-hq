# Foreground refresh performance — 1.478.0

Follow-up to [first-open loading](mobile-loading-1477.md): a focus event can queue
a second score refresh during startup. GameDay and Clubhouse were also passing
`maxAgeMs:0` to the player directory, bypassing both fresh device metadata and the
compact server cache. A public browser reproduction recorded the full provider
catalog with `cache:no-cache` after focus.

Score refreshes still bypass weekly-score caches and refresh NFL game status.
They now reuse player metadata for its existing five-minute lifetime (one day
for a completed Clubhouse week). Explicit trade verification still uses
`maxAgeMs:0`, and missing or stale player data retains its provider fallback.
This avoids a full-catalog download when a fresh directory is already available;
it does not defer score updates or change player valuation.

The full-app mobile startup harness checks plain and explicit Home URLs,
foreground score refresh without a fresh-catalog redownload, explicit direct
verification, missing-cache fallback, storage failures, width and uncaught errors.
[Browser checks](mobile-loading-1478/checks.json).

Validation: `pnpm check` passes 2,142 tests across 259 files, release/theme/type/name
checks and the production build (83 modules, 3 startup, 4 Home). All 13 full-app
startup browser checks pass at 390px width. Provider calls and league writes are
isolated in that harness. Physical-phone timing remains unverified.
