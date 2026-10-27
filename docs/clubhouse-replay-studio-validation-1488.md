# Clubhouse replay studio — 1.488.0

Clubhouse Highlights uses a two-column mobile clip grid grouped by NFL game,
with game, player and text filters. The Home preview retains its compact rail.
The delegated page-tab swipe excludes highlight and NFL game surfaces, allowing
native horizontal panning in both directions without switching Clubhouse tabs.

The shared native-video viewer has a DFL Replay frame, game identity, a subtle
stadium wash, and connected transform/opacity entrance and dismissal. It keeps
native playback controls, the uncropped video aspect ratio, publisher fallback,
keyboard navigation, focus return, reduced motion, and immediate media cleanup.
Reopening during dismissal cancels the previous completion. Search and metadata
refreshes preserve the media element. Short portrait, landscape and keyboard
viewports retain useful clip browsing space.

Clubhouse's NFL games tab and the viewer's NFL game center share a read-only
controller for selecting this week's games, complete provider play-by-play,
scoring/big-play filters, and NFL box-score stat lines. Game selection stays
reachable while scrolling. Exact roster matches show current league points and
owner identity. Other players use recorded weekly Sleeper PPR, including unusual
scoring/conversions; unavailable or ambiguous totals show a dash. The controller
validates game/season/week, coalesces provider summaries, caches final games,
refreshes visible active games, retains a same-game snapshot on refresh failure,
rejects late responses, and stops polling on tab/route departure.

The service-only highlight collector can associate clips with exact NFL plays.
It checks official structured participants from the constructed ESPN play URL,
full names, game, play type, yardage, publication window and uniqueness. It never
resolves an athlete from abbreviated play descriptions. Compound, ambiguous,
reversed and unmatched clips remain browsable without a play link. Core lookup
work has bounded concurrency and a short per-game budget. A temporary lookup
failure preserves an existing link only for unchanged game/headline/kind.

Fresh, opted-in, starter-only big-play/TD notifications add “Video available”
only for a playable unexpired exact-match clip. The sender independently checks
the member/play/route, saved moment, live-feed freshness and clip metadata. An
expired clip falls back to the saved play without losing the alert. In-app
moments offer the same video route. No duplicate follow-up push is introduced,
and alerts do not wait for a publisher to release footage. Clips often arrive
several minutes after the actual play, so many immediate alerts will correctly
have no video label. Deep links auto-open the exact clip; unavailable clips
open the requested game's play-by-play with a notice.

## Validation

- Full release checks: version, theme, TypeScript, unresolved names, unit tests,
  generated bundles and offline dependency coverage.
- Original worker TypeScript passes pinned Deno 2.5.4 checking. Deployment uses
  esbuild 0.25.12 derivatives with pinned npm dependencies left external.
- Shared reel browser: 157 checks, including 320/390 light/dark, 320×568,
  844×390, desktop, constrained visual viewport, focus, search/media identity,
  reopening during exit, expiry and cleanup.
- Actual Clubhouse page: 160 checks across 320/390 light/dark, including real
  CDP touch gestures in both directions, grouped grids, game/player search,
  full NFL play-by-play, fantasy, 44px actions, 4.5:1 text, exact clip links,
  missing-video fallback, rapid scope changes and no league writes.
- First-launch harness retains compact player-directory reads and no initial
  video downloads; route departure releases playback.
- PostgreSQL 17 tests verify numeric play links, unchanged expiry RLS and no
  browser writes. The applied migration is 20261027002343.
- Supabase advisors report no highlight-table notice; existing project notices
  were not changed by this work.

Screenshots and detailed run logs remain local review artifacts. Test footage is
synthetic and used only to verify native decoding and player lifecycle. Provider
metadata fixtures retain the original NFL play descriptions and stat lines.

The protected production collector dry run returned 200 for 14 NFL games and 48
clips, with 30 exact play/video links and no provider failures. The normal
collector has persisted those 30 links. Existing rows retain their Tuesday
06:00 America/Chicago expiry. Collector v5 and notification sender v16 are
backward compatible with the previous frontend; the live-play worker is released
after the new frontend so it cannot emit an unsupported video target.

A compiled-app smoke test against real read-only league/NFL data verified 48
clips in 12 game groups, loaded publisher posters, 1920px native video playback,
39 player filters, 168 NFL plays, 20 fantasy box-score rows, exact play/video
opening and media cleanup, with no page errors. App-wide Pulse styling is
included in the Clubhouse harness; the six tabs stay on one scrolling row.

### 1.488.1 follow-up

Opening a video from the viewer's game center clears the previous clip-search
text as well as its filter state. The complete Clubhouse harness now passes 164
checks, including search → NFL play → exact video. The public 1.488.0 smoke test
also passed against real data: 49 clips across 13 game groups, 41 player filters,
full NFL play-by-play, 20 fantasy rows, native video and cleanup with no errors.
Backend workers are deployed: game-highlights v5, send-notification v16 and
live-football v4. No member test push was sent.

The 1.488.1 dismissal also holds the paused current video frame during its exit
instead of flashing back to the poster. Media is released at completion, or
immediately on route departure. The shared reel harness passes 159 checks,
including interrupted dismissal and reopen.
