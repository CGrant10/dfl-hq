# Clubhouse matchup paging and image loading — 1.533.0

Clubhouse Matchups now follows horizontal finger movement between the league's
six matchups. It uses the same selected matchup as the native selector, previous/
next buttons, score strip, full lineup, clips and stats. A swipe updates the exact
matchup route without changing the Clubhouse tab or scrolling to a new heading.
The first/last edges resist and return instead of wrapping unexpectedly.

The established swipe-tab controller supplies direct manipulation, inert neighbor
previews, interrupted-arrival recovery, reduced-motion navigation and cleanup.
Neighbor lineups are prepared once from the current loaded model, without a new
score request or an additional polling loop. The outer Clubhouse tab gesture
leaves this area alone; controls, clip rails and charts retain their own input.
Only moving panes use temporary compositing hints, cleared when movement ends.

Shared portrait and poster loading also receives a focused cleanup:

- Small player rows keep the existing thumbnail source. Larger player-card,
  comparison and Auto Scout portraits request the larger publisher image, with
  thumbnail fallback. Provider dimensions vary: sampled Ladd files were both
  350×254; sampled Diggs thumbnail/full files were 250×181 and 300×218. No fake
  resolution increase or blanket full-size download is claimed.
- Fixed image dimensions, face-aligned framing and short opacity reveals preserve
  text placement. Reduced Motion, global motion-off and local motion-off suppress
  those transitions. Existing illustration and logo framing remains deliberate.
- Home/reel posters retain their validated original publisher fallback when the
  optimization service fails, including across live updates. They offer
  240/480/960px variants and let native lazy-image sizing
  choose the display-appropriate file. Tests observe one poster request, 480px at
  1x and 960px at 3x for the tested phone surface.
- Live DOM reconciliation retains a loaded image, including a successful fallback,
  while its ordered source/preference list is unchanged. Changed saved photos
  invalidate that identity normally. Failed images restore initials rather than
  leaving a blank `has-photo` state. Existing Sleeper/DFL preference order remains.
- Source identity is a bounded memoized presentation fingerprint, avoiding duplicate
  large uploaded data URLs in every image's DOM. It is never an authorization key.

## Validation

- `pnpm check`: 2,424 tests in 293 files, release markers, themes, types, names and
  production build pass. The build retains 90 application modules.
- 100 real-touch Clubhouse checks cover all six games at 320/390px, Light/Dark,
  finger tracking, inert prepared previews, exact routing, reverse/edge/cancelled
  gestures, interrupted arrivals, native selection, vertical scrolling, Reduced
  Motion, no accidental player-card opening and complete temporary-layer cleanup.
- The existing Clubhouse suite passes all 297 checks across tabs, clips, NFL views,
  lineups, profile actions, completed states and Home shortcuts.
- Four controlled image cases cover visible production portrait boxes, 1x/3x
  density, delayed loads, large-photo fallback, DFL/Sleeper fallback, stable text
  position, source changes, refresh retention and Reduced Motion. No page errors.
- Existing player-card motion checks pass all 37 states, including photo-first
  entrance, reverse/close, repeated opening, scroll reset, resize and motion-off.
- Read-only compiled Home captures pass all ten slides in both themes. Compiled
  Clubhouse passes actual forward/backward touch paging at 320/390px in both themes.
  Real member screenshots remain local; committed screenshots use isolated fixtures.

[Swipe checks](clubhouse-swipe-images-1533/swipe-checks.json) ·
[Image checks](clubhouse-swipe-images-1533/image-checks.json) ·
[Weekend reel checks](clubhouse-swipe-images-1533/clip-checks.json) ·
[Clubhouse checks](clubhouse-swipe-images-1533/clubhouse-checks.json) ·
[Player motion](clubhouse-swipe-images-1533/player-motion-checks.json)

Physical Safari and VoiceOver remain unmeasured. Local Chromium supplies the
browser evidence; no new visual direction or page redesign is part of this release.
