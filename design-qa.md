# Aftermath Share Card — Design QA

## Evidence

- Source visual truth: `design-qa-assets/aftermath-option-2-source.png`
- Implementation route: `mocks/aftermath-qa.html`
- Implementation screenshot: unavailable; no browser surface was exposed to the workspace
- Target viewport: 1080 × 1080 canvas, displayed at a 1024 × 1024 comparison viewport
- Source pixels: 1024 × 1024
- Implementation pixels: 1080 × 1080; intended CSS display size 1024 × 1024; device scale factor 1
- State: Monday Aftermath, Week 1, PRE-MNF · LIVE

## Findings

- [P1] Browser-rendered comparison unavailable
  - Location: full share card.
  - Evidence: the selected source image is available, and the deterministic browser fixture is implemented, but the workspace returned no available browser and rejected the in-app browser target.
  - Impact: typography, watermark opacity, exact spacing, and final canvas raster quality cannot be verified from visible browser evidence.
  - Fix: open `mocks/aftermath-qa.html` in an available browser, capture the square canvas, combine it beside the source image, and perform the required visual comparison.

## Required fidelity surfaces

- Fonts and typography: implemented with the app's Rajdhani display face and narrow/system fallbacks; browser-rendered weight, wrapping, and antialiasing remain unverified.
- Spacing and layout rhythm: implemented as the selected centered hierarchy with 70 px outer margins, a dominant score, two equal award columns, and a bottom bench strip; visual measurement remains unverified.
- Colors and visual tokens: implemented from `SHARE_INK` using Medicine black, warm white, gold, crest red, and crest blue. No new palette was introduced.
- Image quality and asset fidelity: uses the supplied `dfl-seal-heritage-512.webp` at 4.5% opacity as the background watermark; browser raster sharpness and opacity remain unverified.
- Copy and content: Sunday and Monday labels, season/week, live status, projected king, projected gap, pain watch, bench warrant, and league creed are generated from current weekly data. Monday is deliberately labeled PRE-MNF · LIVE rather than FINAL.

## Full-view comparison evidence

Blocked because a browser-rendered implementation screenshot could not be captured.

## Focused region comparison evidence

Blocked for the same reason. The hero score and lower award grid require focused visual inspection once browser capture is available.

## Interaction checks

- Automated tests cover Sunday/Monday state switching and data selection.
- The share handler is attached directly to the click event and calls the synchronous canvas share path, preserving iOS user-gesture behavior.
- Browser share-sheet behavior and console output could not be checked without a browser surface.

## Comparison history

- Initial pass: blocked before comparison because no browser target was available. No source-to-render visual fixes were claimed.

## Implementation checklist

- Capture `mocks/aftermath-qa.html` at the target viewport when a browser is available.
- Compare the full card and focused hero/lower-grid regions against the selected source.
- Fix any P0/P1/P2 visual drift, recapture, and update this report.

final result: blocked
