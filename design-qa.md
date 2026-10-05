# Home readability and DFL stories — v1.300.0

Final result: passed.

## Scope and evidence

Home uses the shared navigation presentation, a smaller uncropped anniversary banner, solid broadcast text surfaces, and compact fantasy scores. Daily archive facts, personal rivalry receipts, and the existing Wall preview appear in the main flow. Archive stories load independently of current weekly projections; existing broadcast slides and controls remain available.

This is a refinement of the selected option-3 design. The previous typography and broadcast-spacing correction shipped in [PR #164](https://github.com/CGrant10/dfl-hq/pull/164). This review evaluates the final refinements and their responsive behavior.

Reviewed application commit: `9975a44e1de4b90fca2643bf67067267dd540dea`.

- [Browser captures and assertions](https://github.com/CGrant10/dfl-hq/actions/runs/37388045621)
- [Full repository checks](https://github.com/CGrant10/dfl-hq/actions/runs/37388045086)
- Local evidence: `/workspace/dfl-review/final/`, including `browser-checks.json`, full Home and stories captures, navigation captures, all twelve slide captures, and the 3× phone-density capture.

The fixture uses production Home markup helpers, styles, navigation, carousel, real slide generators, player portraits, and WebGL effects with deterministic sample data. It does not write to league data. Authenticated live requests, live score polling, and destination-page content are outside its verification scope. Navigation comparisons change the route state on the shared shell rather than loading every destination.

## Findings and fixes

| Finding | Correction | Verified result |
| --- | --- | --- |
| Home's navigation differed from other routes. | Share the six-tab icons, colors, sizing, and typography across routes; keep narrow labels readable. | 24 navigation comparisons across eight route states at 320, 390, and 1280px have identical presentation and no label overflow. |
| Artwork and scores competed with the content. | Show the full anniversary artwork at a smaller size; reduce team and player score type. | At 390px the banner is 96px high with its native 3:1 ratio; player scores are 24px and team totals 22px. |
| Broadcast copy sat over photography. | Use a solid dark stage with photos in a separate 72px band. | Computed stage background image is none; image announcements and every other treatment fit without control collisions. |
| DFL facts, rivalries, and the Wall were hidden in More. | Put sourced archive stories and the existing Wall preview before the disclosure; load lore independently. | Full-page and scrolled captures show both story cards and the Wall outside details. Sparse history retains honest History links. |
| Phone bottom padding changed navigation height without moving the ticker. | Preserve exact measured height and observe the navigation border box so padding changes trigger measurement. | With 34px extra bottom padding, navigation height and measured height are both 101px; navigation top and ticker bottom are both 743px. |

Final Home, stories, narrow-phone, desktop, navigation, image-announcement, and injury captures were inspected. The seal and all four reference player rows remain visible, with the final row ending at 711.89px above the ticker at 747px. Injury names and full status labels stay within their content area.

## Validation

Full checks passed: TypeScript, unresolved-name scan, 1,095 tests across 123 files, and production build.

The Chromium review passed:

- Twelve slides across all eight production treatments at 320, 390, 768, and 1280px: 48 states.
- Content and controls stay separated; no horizontal overflow or clipped primary sections.
- Next/previous navigation, pause, active slide indicators, and Clubhouse links work.
- Shared navigation across eight route states, including Golf and More destinations.
- Phone padding increases and resets without leaving the ticker behind.
- Smooth local Anton type loads with no synthetic score stroke.
- Score effects render at 3× phone density; reduced motion stops animation.
- No browser page errors.

Strict player fire above 15, ice below 10 with the halftime/final gate, defense exclusion, and neutral team totals retain their existing behavior.

No unresolved findings remain within these reviewed states.
