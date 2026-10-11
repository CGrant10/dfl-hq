# Optional matchup moments — v1.371.0

Notifications adds a separate **Matchup moments** category for late close games and the current final result. It is off by default, including on existing devices. Choosing Game day or Everything explicitly includes it; Essential does not. Existing kickoff injury alerts retain their separate Matchups setting.

## Eligibility and delivery

- A close game requires verified live NFL status, known starter states, a combined actual score of at least 50, a margin of ten points or less, and one to four starters remaining across the two teams. At least one of those starters must currently be playing. NFL live status must be within six hours of its actual kickoff; missing, future, stale or postponed status cannot trigger it.
- Result alerts wait for every game in the verified NFL slate to finish, four to twelve hours after the last kickoff. Known no-game projections cover bye starters. Missing player status or actual scores withholds the result. The copy calls this the current final score and acknowledges stat corrections.
- Only owners mapped to the actual two-team matchup and with an enabled device explicitly subscribed to Matchup moments are eligible. The notification sender rechecks that opt-in before inserting an inbox message. No opt-in means no optional push or optional inbox message.
- Each owner can receive at most one close-game alert and one result alert per season/week. Existing unique source keys deduplicate repeated or concurrent polls; swings in the lead do not trigger repeated messages.
- Close-game alerts expire after 30 minutes; results after two hours. The sender checks expiry before recording/delivering and sets matching Web Push TTL. The existing device worker rejects expired payloads and optional moments do not buzz again for a retried message ID.
- Alert links include the season, week, Matchups tab and exact matchup ID. The existing Clubhouse selector already supports these links, so an alert opens its own game rather than whichever game was remembered.

## Operations

The existing protected `lineup-alerts` worker handles both kickoff injury checks and optional moments. Its ten-minute schedule, auto-sync switch, custom cron-token authentication and twelve-team PPR/one-QB league checks stay authoritative. Optional preference, owner-name or moment-history failures withhold moments while retaining injury checks. There are no new schedules, public RPCs or tables.

`matchup_moments_schema.sql` only extends the existing notification category constraint. It preserves all previous categories, device subscriptions, defaults and member permissions. Deploy the current `send-notification` and `lineup-alerts` sources with their relative JS imports after applying it. The workers use the current public Sleeper scores/user names and verified ESPN NFL slate.

## Verification

The focused tests cover opt-in targeting, legal pairing, actual scores, close-game timing, missing/stale provider data, finals, byes, ties, per-owner/week deduplication, device opt-out rechecks, payload expiry, exact destinations and category defaults/presets. Full project checks include identifiers, types, the unit suite and production build; Deno checks both workers and their actual dependencies.

Read-only real-app browser checks exercise all live screens, the exact matchup link, simulated existing-device settings, explicit Game day selection, and 320/390/768 px layouts. All diagnostic writes are intercepted. Backend live checks use authenticated dry runs and sender requests that are already expired or have no opted-in recipients. No test notifications are sent to members.
