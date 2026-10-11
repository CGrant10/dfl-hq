# Matchup moments — v1.372.0

Notifications adds a separate **Matchup moments** category for late close games and the current final result. It is included by default when notifications are enabled. This release adds it once to existing enabled devices; disabled devices stay disabled. Members can uncheck it afterward. Game day and Everything include it; Essential does not. Existing kickoff injury alerts retain their separate Matchups setting.

## Eligibility and delivery

- A close game requires verified live NFL status, known starter states, a combined actual score of at least 50, a margin of ten points or less, and one to four starters remaining across the two teams. At least one of those starters must currently be playing. NFL live status must be within six hours of its actual kickoff; missing, future, stale or postponed status cannot trigger it.
- Result alerts wait for every game in the verified NFL slate to finish, four to twelve hours after the last kickoff. Known no-game projections cover bye starters. Missing player status or actual scores withholds the result. The copy calls this the current final score and acknowledges stat corrections.
- Only owners mapped to the actual two-team matchup and with an enabled device subscribed to Matchup moments are eligible. The notification sender rechecks that opt-in before inserting an inbox message. An unchecked category means no moment push or inbox message.
- Each owner can receive at most one close-game alert and one result alert per season/week. Existing unique source keys deduplicate repeated or concurrent polls; swings in the lead do not trigger repeated messages.
- Close-game alerts expire after 30 minutes; results after two hours. The sender checks expiry before recording/delivering and sets matching Web Push TTL. The existing device worker rejects expired payloads and optional moments do not buzz again for a retried message ID.
- Alert links include the season, week, Matchups tab and exact matchup ID. The existing Clubhouse selector already supports these links, so an alert opens its own game rather than whichever game was remembered.

## Operations

The existing protected `lineup-alerts` worker handles both kickoff injury checks and optional moments. Its ten-minute schedule, auto-sync switch, custom cron-token authentication and twelve-team PPR/one-QB league checks stay authoritative. Optional preference, owner-name or moment-history failures withhold moments while retaining injury checks. There are no new schedules, public RPCs or tables.

`matchup_moments_schema.sql` only extends the existing notification category constraint. It preserves all previous categories, device subscriptions, defaults and member permissions. Deploy the current `send-notification` and `lineup-alerts` sources with their relative JS imports after applying it. The workers use the current public Sleeper scores/user names and verified ESPN NFL slate.

`matchup_moments_default_schema.sql` updates the database default and adds the category once to enabled devices. Other preferences and disabled subscriptions are preserved. A one-time upgrade of old local category caches prevents endpoint repair from undoing the default; current explicit opt-outs, including empty category lists, are retained. Reading server preferences refreshes the local cache.

## Verification

The focused tests cover opt-in targeting, legal pairing, actual scores, close-game timing, missing/stale provider data, finals, byes, ties, per-owner/week deduplication, device opt-out rechecks, payload expiry, exact destinations and category defaults/presets. Full project checks include identifiers, types, the unit suite and production build; Deno checks both workers and their actual dependencies.

CI also runs an isolated request through the same pinned Supabase SDK as production and verifies that category containment serializes as a JSONB array. Both workers use the shared explicit JSON filter; a JavaScript array would instead produce a Postgres array literal.

Read-only real-app browser checks exercise all live screens, the exact matchup link, simulated existing-device settings, explicit Game day selection, and 320/390/768 px layouts. All diagnostic writes are intercepted. Backend live checks use authenticated dry runs and sender requests that are already expired or have no opted-in recipients. No test notifications are sent to members.
