# Adaptive replay and live NFL plays — 1.492.0

Portrait playback now has a resizable split between the video and browser.
Watch/Browse controls smoothly change that split; the grip supports pointer
capture, cancellation and keyboard arrows/Home/End/Enter. Search gives the clip
list more space and selecting a clip expands the player. Compact browsing keeps
a smaller live video frame, while the larger previews use the browser width.
Pane changes preserve the media element, playback position and filters. Each
opening starts with the default split, and viewport/keyboard changes constrain
both panes to the available space. Large queue items align at the top instead
of being centered offscreen. Clubhouse's game groups use larger portrait cards
and additional columns when space permits.

NFL play-by-play and fantasy views automatically check live games every ten
seconds, including inside the replay viewer. The public provider can publish
plays later than the actual on-field action. Reads pause in hidden tabs and
when offline; returning, reconnecting or restoring the page forces a fresh
read. A failed update keeps the last facts and retries. Polls do not overlap.
New plays remain at the top when following live, while reading older plays
preserves the anchored row, open details and selected filter. Final-game status
invalidates the live summary cache before polling stops, so the last play is
not hidden behind a five-minute cache. Manual Refresh remains available.

Validation:

- Full release/theme/type/name/build checks and 2,250 tests in 271 files pass.
- Mobile replay checks cover larger images, Watch/Browse, keyboard and pointer
  resizing without replacing video, default reopening, small/landscape/desktop
  viewports, focus, reduced motion, playback errors and Thursday expiry.
- Clubhouse's 176 browser checks cover team scopes, exact-play video links,
  search, NFL stats, all six tabs and route/media cleanup in Light/Dark.
- 34 deterministic live-controller browser checks cover actual next-play
  insertion, preserved reading position/disclosures, fantasy updates, hidden
  tabs, offline/reconnect, provider failure/recovery, in-flight reads, final
  plays, lifecycle teardown and uninterrupted native video.
- Data-cache regressions verify ten-second expiry, final-state changes, forced
  pending-read deduplication, wrong-game rejection and recovery after errors.

Browser evidence: /workspace/dfl-highlight-review/,
/workspace/dfl-clubhouse-live-review/, /workspace/dfl-nfl-refresh-review/.
No backend functions, league data, notification settings or push deliveries
were changed. Physical installed Safari/iOS remains unverified.
