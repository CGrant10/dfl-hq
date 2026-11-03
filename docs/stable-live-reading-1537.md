# Stable loading, live reading and replay gestures — 1.537.0

Late Home sections keep the content below them in the same screen position
when the changed section is wholly above the viewport. This covers deferred
rankings, advice, trade wire, news, draft, Wall and shared live DOM patches.
The synchronous correction accounts for existing browser scroll anchoring and
collapsed child margins. Content still visible to the reader is not forcibly
scrolled. Dialogs retain their own nested scrolling and play-by-play reading
logic. No scroll listener, persistent snapshot or polling loop was added.
Broadcast's delayed height measurement uses the same correction, so a long
story arriving offscreen does not displace the rest of Home.

Wide broadcast refreshes patch the active card and existing controls. The
current slide, headline, focus and image elements remain instead of replaying
an entrance animation on a data correction. An open story chooser defers a
refresh until it closes, retaining only the latest queued deck. Normal paging
and existing score-change feedback remain. Confirmed dated news/trades move
ahead of routine activity, live stories lead unpinned activity, and explicit
commissioner pins retain priority. Existing expiry and daily archive variety
remain; no content is invented to fill the deck.

Home and Clubhouse's shared replay studio now uses the player-card header drag.
Short pulls spring back, sideways drags cancel and a deliberate downward pull
slides the studio out. Video/list controls retain native gestures. A small
theme-token grip indicates the header gesture. A completed dismissal pauses
and releases playback, restores focus, and resets drag state before reopening.
Normal clip-to-preview close animation remains. Reduced Motion, motion-off,
viewport interruptions and route cleanup use the existing shared behavior.

## Validation

- `pnpm check`: 2,436 tests across 295 files, release versions, theme colors,
  types, unresolved names and the production build.
- [52 reading checks](stable-live-reading-1537/reading-checks.json): 320/390px,
  Light/Dark, native anchoring on/off, delayed growth/shrink, collapsed margins,
  shared live patches, active-card/control identity, correct destinations,
  chooser refresh and offscreen broadcast expansion.
- [277 replay checks](stable-live-reading-1537/highlight-checks.json): header
  gestures, focus/playback cleanup, reopening, native media, filtering, layout,
  resized viewports, enlarged text, Reduced Motion and expiry.
- Broadcast: [90 normal](stable-live-reading-1537/broadcast-checks.json) and
  [56 enlarged](stable-live-reading-1537/broadcast-enlarged-checks.json) layouts.
- Shared interface: 24 layouts and six enlarged layouts. Trade reading: 112
  regression checks. Screenshots inspected in both Medicine Wheel themes.
- 17 first-launch checks pass, including score refresh cache reuse and reel
  cleanup on navigation. Five compiled actual-league screens have no page
  errors or horizontal overflow; their member screenshots remain local.

Fixture captures: [Light clips](stable-live-reading-1537/clips-light.png),
[Dark clips](stable-live-reading-1537/clips-dark.png),
[Light broadcast](stable-live-reading-1537/broadcast-light.png),
[Dark broadcast](stable-live-reading-1537/broadcast-dark.png).
All automated visual checks use Chromium. Physical iOS Safari, VoiceOver,
on-device frame pacing and battery consumption are unmeasured. No paid feeds,
new theme options or backend writes are introduced.
