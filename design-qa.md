# NFL game center — 1.552.0

final result: passed

## Source, scope and normalization

Verified source: Sleeper's official NFL game-center image from its 2023 redesign,
https://sleeper.com/blog/sleepers-app-redesign-whats-new/ . Local visual truth:
`/workspace/dfl-sleeper-reference/official-nfl-field-2023.png` (383 × 820).
The source was opened and inspected before implementation. Public current App
Store material did not expose every requested native screen; this is a faithful
adaptation of the verified game-center composition and interaction pattern, not
a claim of pixel-exact equivalence to the latest installed Sleeper version.

Implementation: `/workspace/dfl-nfl-1552/swipe-ship/dark-390-plays.png`, 390 × 844
at a 390 × 844 CSS viewport, deviceScaleFactor 1. Light/Dark mobile captures,
Fantasy, 320/430/768px, enlarged text and drag state are alongside it. These are
workspace Chromium/Playwright renders, not a cloud-browser or physical-iOS run.
The full production app with current read-only league/NFL data is in
`/workspace/dfl-nfl-1552/local-ship`.

The source shows an in-progress SF/LAR game with Stats selected; the DFL fixture
shows an in-progress CAR/GB play with Plays selected. Compare the shared live
play/field/score/tab regions, not unrelated score-table content. Data and clock
values differ deliberately; current data is never replaced with reference copy.
The source's iOS device chrome is excluded from the focused comparison.

Full-view comparison, opened together:
`/workspace/dfl-nfl-1552/full-comparison-final.png`.
Focused hero comparison, opened together:
`/workspace/dfl-nfl-1552/hero-comparison-final.png`.
The source region (366px wide) is normalized to the DFL content width (358px),
preserving aspect ratio. Overall captures retain their native density; no
pixel-diff precision is claimed across the distinct games or view choices.

## Findings and iteration history

- Resolved P2: the first hero had a separate down/spot toolbar beneath the field,
  making the hero taller and less integrated than the source. The first focused
  comparison is `/workspace/dfl-nfl-1552/hero-comparison.png`. Down/spot now sits
  inside the field at normal text sizes; Replay moved into the play header.
  Enlarged text uses normal flow. The final focused comparison confirms the fix.
- Resolved P2: the initial score looked like a generic neutral row compared with
  the source's sports presentation. Low-opacity real team-code watermarks and
  softly blurred NFL identity washes now support the single readable score.
  The final comparison confirms the treatment without obscuring figures.
- Resolved interaction regressions: immediate reverse gestures now continue from
  the actual rendered position, retain the outgoing live stage through arrival,
  and can start on the stable window. Reading restoration accounts for sticky
  tabs before and after scroll adjustment. Real-touch and reading-return checks
  confirm these fixes; they are not inferred from a static screenshot.

No actionable P0/P1/P2 remains within the verified adaptation scope.

## Five fidelity surfaces

- Typography: retained the app's Inter system, compact 13px play/body roles,
  11px metadata and clear score emphasis. Full descriptions and names wrap;
  native selects retain 16px text and controls retain 44px targets. Sleeper's
  proprietary font details are not asserted as a match.
- Layout: compact game strip; play description and perspective field above one
  NFL score; separate full-width Plays/Fantasy views. The field's down/spot is
  integrated into the plot, and the same view remains selected between games.
  DFL's global shell and two-view scope remain intentional product constraints.
- Colors: DFL Medicine Wheel Light/Dark tokens, genuine NFL identity, a fixed
  sporting field surface and high-contrast field paint. Source navy/pink is not
  substituted for the established app palette. Both modes received contrast,
  selected/disabled control and screenshot review.
- Images: genuine ESPN NFL logos and athlete headshots, lazy-loaded with graceful
  image failure; supplied Phosphor regular icons with MIT license. No generated
  mascot or decorative stand-in. The live field is a functional vector data
  diagram plotted from official coordinates; its flight is illustrative, not
  a raster imitation or invented tracking data.
- Copy/content: actual game/score/clock, full source play text, meaningful
  down/yardage, and exact recorded league/PPR points. Quarter, team, selected
  play, loading/error and game-boundary states remain understandable. No copied
  marketing text, fake possession or guessed PPR totals.

## Interaction and implementation checklist

- [x] Game-strip taps, native picker and previous/next navigation.
- [x] Finger tracking, inert neighbor, release settle, cancellation, short/edge
  resistance, rapid reversal, vertical scroll and deferred live updates.
- [x] Separate Fantasy with side-by-side players, profiles and exact points.
- [x] Finite official-endpoint field motion, Replay, selected/latest play return.
- [x] Saved reading position, filtering, stale-response protection and teardown.
- [x] Light/Dark, narrow/wide phones, 200% Comfortable text and touch targets.
- [x] Reduced Motion/app motion off and absence of idle animation loops.
- [x] Browser console/page errors checked; no production league writes.

## Remaining limits

The latest native Sleeper Plays/Fantasy screens and native swipe timing were not
directly accessible, so exact current-native fidelity is unverified. Physical
Safari frame pacing and VoiceOver speech are unmeasured. These are limits of the
reference/device evidence, not claims that the app matches an unseen screen.
