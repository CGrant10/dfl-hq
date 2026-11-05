# Home Sports Desk — 1.541.0

final result: passed

## Source, viewport and state

The visual truth is the **first displayed generated option** selected by the user:
`/workspace/generated_images/exec-99fd33a2-9172-4542-85a2-ae6c0122ad7c.png`.
Original dimensions: 852 × 1846. Normalized to 390 × 844 CSS pixels for comparison
(the generated aspect ratio differs by less than 0.2%). Implementation: 390 × 844,
deviceScaleFactor 1, production compiled release, Medicine Wheel Dark, Home at the
first broadcast story, upcoming Week 9, Thursday November 5, 2026, America/Chicago.
The source's 143.0 projection is a snapshot; the checked live data returns 142.8.
That data correction is intentional. No scores or standings were fabricated.

Latest rendered evidence is in `/workspace/dfl-sports-desk-1541/release-layout/`.
Local, git-ignored review copies and combined inputs:

- [Full comparison](design-qa-assets/home-sports-desk-1541/comparison.png)
- [Header/matchup](design-qa-assets/home-sports-desk-1541/comparison-header.png)
- [Broadcast](design-qa-assets/home-sports-desk-1541/comparison-broadcast.png)
- [Rankings](design-qa-assets/home-sports-desk-1541/comparison-rankings.png)
- [Dark](design-qa-assets/home-sports-desk-1541/home-dark-16.png)
- [Light](design-qa-assets/home-sports-desk-1541/home-light-16.png)
- [200% text](design-qa-assets/home-sports-desk-1541/home-dark-32.png)

The source and implementation were placed together in each comparison image and
inspected. Screenshots use workspace Chromium/Playwright, not a cloud-browser
plugin or a physical phone. Actual league captures remain local rather than
being committed as new public screenshot assets.

## Findings and comparison history

- **Resolved P1: overlapping matchup names and scores.** The first capture showed
  older, more-specific grid rules placing totals on the name row. Explicit tracks
  now separate names, portraits and totals on both sides. Actual-data checks verify
  containment and pairwise separation at 320/390/430/768px and 100/125/200% text.
  Evidence: `first/home-dark.png` → `third/home-dark.png` → release-layout captures.
- **Resolved P2: the old carousel frame survived the redesign.** The parent border
  and a footer pseudo-element retained rounded edges and a detached toolbar.
  The parent is now borderless; artwork reaches the full frame and controls overlay
  it. Previous/next, story selection and pause retain keyboard/touch access.
  Evidence: `comparison-third.png` → latest combined broadcast comparison.
- **Resolved P1: enlarged text needed a different composition.** Initial 200% text
  squeezed team names across their columns and put large daily type over the
  athlete. Container-based score layouts now separate portraits, full names and
  non-wrapping scores; enlarged daily headlines use a separate image row. Totals
  align across teams. Evidence: `verified/home-dark-32.png` → release-layout 32px.
- **Resolved P2: rankings were too loose relative to the target.** Their margin and
  rows were tightened, faces and team labels made clearer, with one aligned list
  and ranking-week selection in a compact disclosure. The final normal phone frame
  shows both leading teams above navigation. See the combined rankings comparison.

- **Resolved P2: extreme ranking names and enlarged controls.** Long opposing team
  names now reserve a common name track so the matchup totals remain aligned.
  Enlarged ranking rows reflow names and ratings onto separate rows; their header
  also reflows, and rating buttons reserve room for the rotated chevron. The
  production rankings controller passes the updated week-picker, expansion,
  full-report, image fallback and reduced-motion checks, including 200% at 320px.
  Evidence: `/workspace/dfl-sports-desk-1541/power/power-review.json` and its
  `power-large-text-dark-320.png` / Light counterpart.

- **Resolved P2: section jumps used the previous header height.** Home section
  scroll margins now use the shared header and desktop navigation measurements;
  active trade coverage reserves space too. Existing score-dock margins retain
  their measured stack. The compact sliding marker and 56/64px header / 72px phone
  navigation are checked by `tools/capture-home-shell.py`.

## Required fidelity surfaces

- **Fonts/typography:** existing local Inter for UI and Rajdhani 700 for display and
  scores; no extra font request or synthetic 900-weight display face. Headline
  weight, wrapping and hierarchy were compared at full view and in the broadcast
  crop. Full team names remain real text. Exact generated wordmark lettering is
  replaced by the existing DFL wordmark treatment, intentionally shared app-wide.
- **Spacing/layout:** the chosen order is matchup, broadcast, trade alert, rankings,
  highlights, week tools, league/archive, then Wall. The 390px broadcast is about
  260px tall and full-width. Shared chrome uses consistent sizing across routes.
  Week selection, expansion and scrolling remain available.
- **Colors/tokens:** existing Medicine Wheel foundations, accents, semantic text
  and surface tokens; no new palette or restored legacy blue/red UI colors. Both
  themes were inspected. Forty-four visible text samples per theme pass the
  CSS-surface contrast check (minimum 5.64 Light / 9.90 Dark in the sampled state).
  This is not a complete raster-image contrast or WCAG conformance assessment.
- **Image quality:** actual existing round DFL mark, member pictures and
  `dfl-daily-hero.webp` are retained. The shield is not introduced into Home.
  The alert uses a generated transparent raster siren (128 × 160, about 8KB).
  Raster edges/crop, portrait containment, and headline/image separation were
  inspected. No generated full-screen screenshot is used as the actual interface.
- **Copy/content:** daily wording, current team names, real forecast values, trade
  verdict and ranking facts come from existing models. No extra explanatory copy
  was added. The redundant “Tap for the full receipt” suffix was removed.

## Interaction and responsive evidence

`/workspace/dfl-sports-desk-1541/final/checks.json` records 32 actual-data cases:
24 viewport/text/theme combinations, CSS-surface contrast in both themes,
ranking expansion and ranking-week focus, sticky alert behavior, exact receipt
links, alert re-entry without duplicate hosts, keyboard pause and six native
forward/backward swipes per theme. Clubhouse and History were captured to check
shared chrome and route overflow. No page errors or horizontal document overflow.
All provider mutations were blocked by the review harness.

The final layout-only rerun after the long-name/rank-layout fixes records 26 passing
cases in `shipped-layout/checks.json`. The rankings controller review additionally
checks very long names, current images and enlarged headers/ratings.
Production-renderer broadcast fixtures cover 90 normal layouts and 56 enlarged
layouts, unchanged frame height across stories, complete routed packages, long
names, image/text zones, pause/picker targets, reduced motion and replay. Enlarged
fixtures were rerun after the large-text changes. These are explicitly isolated
fixtures, not claims about live league scores.

## Implementation checklist

- [x] Resolve the selected generated image.
- [x] Implement the Home composition using existing live models and assets.
- [x] Inspect full and focused combined visual comparisons.
- [x] Fix actionable P1/P2 differences and recapture.
- [x] Verify Light/Dark, narrow widths, enlarged text and primary interactions.
- [x] Run themes, tests, type/name/release checks and production build.

## Release gate maintenance

The historical `capture-home-review.py` standalone assertions describe retired
masthead, carousel, font and Clubhouse behavior. Its fixture helper definitions
remain available for the ranking runner. CI now uses the current production Home
surface runner (`capture-interface-system.py`) plus `capture-home-shell.py` for
cross-route chrome, active marker, touch targets, safe-area spacing and Home jumps.
The current Home runner passes 24 layouts and six enlarged cases; the shell runner
passes 60 checks across routes/themes/widths, safe-area spacing and section jumps.
Dedicated broadcast, current Clubhouse, media, score/scroll, sheet, trade, Arena and
database runners remain in the workflow. This avoids treating the historical
fixture's expected UI as the design source for a new production layout.

## Follow-up polish and boundaries

P3: the existing round logo and clean wordmark use the app's real assets and fonts;
rank markers are simple rectangular UI tags instead of the mock's angled graphic.
The production version keeps unobtrusive previous/next, story count and dismiss
controls missing from the mock. Ranking week, movement and expansion also remain
available. These are accepted product constraints rather than incomplete controls.
Physical Safari/VoiceOver, on-device frame rates and battery impact are unmeasured.
Trade valuation, Arena and backend behavior are outside this visual change.
