# Editorial broadcast visual QA — 1.532.0

Selected visual truth: the **second displayed image from the latest ideation set**,
`/workspace/generated_images/exec-e61286db-85c0-4e77-ba81-cf2528665d1d.png`.
Preserved source: [source](docs/broadcast-editorial-1532/source.png).
This is the selected light editorial direction, not the earlier gold-framed set.

The source is a 1024 × 1536 storyboard of three carousel states. Comparison uses
individual component crops (award, trade, bench), normalized proportionally to
356 CSS pixels wide; the full storyboard is never stretched to a phone viewport.
Implementation captures use a **390 × 844 CSS-pixel phone, deviceScaleFactor 1**.
Its component captures are 356 × 205 pixels. Each comparison matches the source's
story, names, date, value, Light theme and closed-control state. Real pagination
reflects the active item and fixture deck length rather than copying the mock's
illustrative `1 / 10` onto every state.

Full comparison: [selected versus rendered](docs/broadcast-editorial-1532/comparison-light.png).
Focused comparison: [trade typography, portraits and routing](docs/broadcast-editorial-1532/comparison-trade.png).
Both combined inputs were opened after the final render. Dark award, bench,
Chip Eater and the ten-story picker were also visually inspected.

## Findings and comparison history

- **P1, corrected:** inherited `with-art` margins pushed the bench headline into
  its score. Evidence: initial-metric.png. Metric copy now has its own left column,
  a full-width category and a separate figure. Post-fix: editorial-light-2.png and
  the final combined comparison show clear separation.
- **P2, corrected:** initial team labels/portraits were too small and the frame
  was unnecessarily tall. Evidence: iteration1-comparison-light.png and
  iteration1-comparison-trade.png. Two-team receipts now use explicit receiving
  columns, 13px team/player text and 38 × 42px portraits; a 196px minimum grows
  only when the edition's content requires it. Post-fix: final comparison files.
- **P2, corrected:** enlarged three-team receipts inherited a narrow fixed track,
  causing vertical word wrapping and excessive reserved height. Explicit large-
  text tracks and stacked injury rows now pass all 56 enlarged-text layouts.
- **P2, corrected:** a trial enlarged award crop cut the helmet. It was rejected.
  The final implementation contains the complete original illustration, including
  arm and helmet; no member avatar or generated substitute is used.
- No actionable P0/P1/P2 findings remain in the final comparison.

## Required fidelity surfaces

- **Typography:** locally hosted Inter matches the reference's clean UI voice.
  Award titles use 22px/1.15; ordinary headlines 20px/1.15; player/team rows 13px.
  Longer award names use 18px and system text scales rather than being clipped.
  Numbers remain distinct from headings; no forced single-line name shrinking.
- **Spacing/layout:** left artwork window, light receiving-row separators,
  compact balance/action line and quiet progress/transport follow the selection.
  One stable height per edition deliberately replaces the storyboard's varying
  card heights, preventing Home from moving during rotation. At 320px, `gets`
  moves beneath its team label; at enlarged text, images and scores reflow.
- **Colors/tokens:** Light uses the existing bone/white/deep-red tokens. Dark uses
  its Medicine Wheel counterparts. No fixed light surface, blue/red legacy
  palette, gold frame, new theme choice, texture or decorative glow was added.
- **Images/icons:** original champion and Chip Eater WebP illustrations are reused
  with contained proportions. Existing Sleeper portraits and their real fallback
  initials remain. Controls reuse the app's icon sprites. No CSS artwork or new
  hand-drawn SVG replaces a source asset. Original asset aspect ratio takes
  precedence over reproducing the mock's tighter generated illustration crop.
- **Copy/content:** source fixtures retain the exact names, historical dates and
  63% balance for comparison. Production still reads its real current teams and
  receipts; no example trade or quote was hardcoded into the production deck.
  Awards have one identity and action, with repeated filler removed.

## Interaction and accessibility checks

Browser-rendered verification used local Chromium against the production
renderers and compiled app. The chat's cloud browser tools were unavailable;
this existing-app workflow used its established local browser capture tooling.

- All 90 normal and 56 enlarged-text layouts pass containment, artwork/copy
  separation, text contrast and stable-height checks in both themes.
- Real touch swipes forward/backward, no accidental story-link activation,
  visibility-aware dwell, one-pass autoplay, replay and Reduced Motion pass.
- Previous/Next/Pause and the story chooser retain at least 44px targets.
- The ten-story chooser fits inside the frame; selecting a story closes it,
  returns focus and preserves the exact routed receipt link. Escape closes it.
- Opening the chooser pauses autoplay; replacing an open chooser during live
  enrichment releases that pause. No new timers, network reads or polling added.
- No browser page errors in the component captures or compiled Home checks.

## Remaining P3 notes / limits

- The mock's diagonal action arrow uses the app's existing right-arrow sprite for
  consistency with other pages. This does not change the action or hierarchy.
- Full title names, original artwork proportions and 44px controls can require
  more height than the shortest mock state. Height remains stable during browsing.
- Physical Safari and VoiceOver are unmeasured; no device-level claim is made.

## Implementation checklist

- [x] Exact selected reference resolved and source assets preserved.
- [x] Initial visual findings fixed and final combined comparisons opened.
- [x] Light/Dark, narrow phones, larger text, transport and swipe paths checked.
- [x] Existing slide curation and production data routes preserved.

final result: passed
