# GameDay readiness and deliberate replay selection — 1.565.0

## Fixed

The replay window's native game strip used scrollend/a 140ms debounce to select
the centered game. This could replace footage simply because a member browsed
other games. Scrolling now only browses. A game button, previous/next control,
Enter or Space explicitly selects a game. Arrow/Home/End keys browse focus and
do not also trigger the surrounding clip shortcuts. Native scrolling and snap
remain; no video layer is dragged/cloned and no new polling is introduced.

Score updates retain a browsed strip position and the playing video. Resizing
only recenters the selected game when the member has not browsed elsewhere.
Pointer movement/cancellation suppresses the trailing drag click; a fresh tap
is immediately usable. All event listeners and the ResizeObserver are removed
on teardown. Existing source-row open/close, clip filters, no-clip/Plays/Fantasy,
minimize/restore and exact game destinations remain.

## Evidence

Scratch artifacts: `/workspace/dfl-ready-1565/`.

- `replay-before.log`: regression reproduces on the original controller at
  320px Light immediately after a genuine touch swipe; selected game changes.
- `replay-final/`: 88 passing browser assertions at 320/390px Light/Dark,
  including touch/wheel browsing, video identity/source/time preservation,
  live score updates without recentering, drag-release click suppression,
  fresh intentional tap, keyboard focus versus activation, Reduced Motion,
  no-clip games, late responses, Plays/Fantasy, dock/restore and close/focus.
  This persistent suite now runs in the existing NFL-center CI job.
- `compiled/`: actual release bundle, two themes, public league reads with
  isolated clip/media fixtures and blocked writes. Native swipe changes the
  rail's offset while keeping game and video identity; explicit Next switches
  games; close releases video and restores focus. No browser errors.
- `nfl-refresh/`: 72 assertions for automatic new plays, older-play anchors,
  independent Plays/Fantasy reading positions, reconnect/cache bypass,
  hidden/offline/modal pause, recovery, single-flight reads, final-game stop
  and stale-request protection.
- `clubhouse/`: 333 assertions; personal lineup/leader layout, weekly stats,
  roster highlights, mode/filter preservation, effects continuity, completed
  games, phone contrast and 44px controls, no league writes.
- `swipes/`: 156 assertions across mobile widths/themes, all six matchups,
  own matchup first, interrupted/reversed swipes, keyboard, Reduced Motion,
  no overflow or writes. `nfl-swipes/`: 60 assertions including game-stage
  swipes, native taps, early-play details and teardown.
- `points/`: 72 assertions for visible player deltas, corrections, unchanged
  and older cached scores, reduced/app-off motion and cleanup.
- `live-football/`: 85 assertions, verified touchdown/big-play effects, red-zone
  starters, stale/failing feeds, duplicate prevention, scrolling/modal effects,
  reduced motion and no real notification/database writes.
- `live-tickets/`: 48 assertions; accepted versus moved lines, unknown/zero
  stats, live versus terminal/pending, full six-leg receipts, priority preview,
  node-preserving refresh and large text. `results/evidence/`: 48 assertions
  for completion, losing late legs, provisional expiry, official final results
  and shared receipt marks.
- `highlights/`: 280 assertions for clip browsing, player filters, delayed-media
  replacement, reopening/quick-close races, retained footage through Wednesday,
  Thursday expiry, large text and no real writes.
- `pnpm check`: 2,515 tests in 304 files, including notification recipient/video
  route validation, member/play deduplication, trade capture, reconnect,
  scoring and settlement. Release/theme/type/name/build checks pass.

## Read-only worker check

Supabase project matches the configured DFL HQ endpoint. On 2026-11-08, the
trade-watch (every two minutes), live-football (every minute) and highlights
(every three minutes) cron entries were enabled. Their latest scheduler runs
at 13:54 UTC succeeded. Aggregate pg_net responses for the preceding 15 minutes
were 36 HTTP 200s with no transport failures. This confirms scheduling and
recent HTTP health, not device receipt of an individual alert. No job was
triggered manually; no league data, subscriptions or push settings were changed.
No real phone push, native iOS playback/pacing or VoiceOver delivery was tested.

The final release retains 88 application modules, three startup/four Home
modules, existing artwork/styles and the prior release for cached clients.
