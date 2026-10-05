# Broadcast Home — v1.298.0

Final result: **passed** for the selected option-3 visual implementation and production-component browser review.

## Reference and evidence

Selected reference: `exec-b10c2c8d-0155-43a7-a138-d5ddf329ec7c.png`, 853 × 1844, normalized to 390 × 844 for comparison. This report replaces the prior report for a different design.

Final application commit reviewed: `ae165301811261459e6687b1938795fae5cf6a1f`.

- Browser captures and check results: [Home design review](https://github.com/CGrant10/dfl-hq/actions/runs/37333514518), downloadable workflow artifact.
- Full suite: [TypeScript migration check](https://github.com/CGrant10/dfl-hq/actions/runs/37333514460).
- Workspace evidence: `/workspace/dfl-review/capture-final/comparison.png`, `shell-hero-comparison.png`, `leaders-nav-comparison.png`, `home-390.png`, `home-320.png`, `home-1280.png`, and `browser-checks.json`.

The final review inspected the same-viewport full comparison, both focused comparisons, and the 320px and 1280px captures. The fixture renders production Home presentation, carousel, stylesheet, navigation symbols, and score effects with deterministic sample data. It does not write league data.

## Visual review

The implementation follows the reference's dark charcoal shell, gold accents, native anniversary artwork, stadium broadcast, cream Clubhouse CTA, compact personal matchup, four-row player leaderboard, ticker, and six-tab navigation. The original anniversary asset remains intact. The new stadium artwork is positioned with the player on the right and readable copy on the left. The licensed DFL Broadcast display font follows the reference's compact varsity lettering; body text remains readable system text.

At 390px, the topbar is 57px, anniversary banner 130px, broadcast 254px, and leaderboard 215px. These closely follow the normalized reference's approximately 59px, 129px, 253px, and 215px. Broadcast body copy occupies two lines, and the CTA, dots, arrows, and player rows retain the reference's placement and density. At 320px, the compact matchup can wrap its owner metadata while keeping totals and controls readable. Desktop retains the existing top navigation and a centered wider Home column.

Resolved findings:

| Priority | Finding | Verified correction |
| --- | --- | --- |
| P1 | Earlier presentation used oversized player portraits and mismatched typography. | Production-scoped styles now render four compact portrait rows and the varsity display font. |
| P1 | New navigation symbols were outside an SVG namespace. | Symbols live inside an SVG; all six tabs render and the browser checks their references and namespace. |
| P2 | Broadcast copy and controls competed for space. | Two-line copy, single-line CTA, separate dots and arrows match the reference hierarchy. |
| P2 | Legacy negative margins shifted the Home page 16px left. | Removed the old bleed offset; native banner and section gutters align with the viewport. |
| P2 | Small viewport branding and leaderboard density differed. | Seal remains visible at 320px; compact rows keep the player preview above the ticker and navigation. |

No unresolved P0, P1, or P2 visual findings remain in the reviewed states. Small optical differences remain in fictional reference letterforms and exact icon shapes. Production uses real player and owner portraits, actual records, and actual status labels. Animated fire and ice naturally differ by frame from the reference still image; both remain attached to the score numbers.

## Behavior and validation

- All existing broadcast slides, rotation, pause, dots, arrows, and refresh behavior are retained behind the new Clubhouse opener.
- Strict player temperature boundaries remain: hot above 15, cold below 10 with the existing halftime/final eligibility gate. Scores exactly 15 or 10 stay neutral. Defenses remain neutral and are excluded from the preview and Hot/Cold filters.
- Team totals stay neutral. Player-card and Watch hooks remain connected; league tools and score controls remain available in disclosures.
- Standard CI passed: 1,092 tests in 123 files, type checking, unresolved-name checking, and the production Arena build.
- Browser checks passed at 320, 390, and 1280px: no horizontal overflow, next/previous slides, pause, correct Clubhouse target, working WebGL score renderer, two hot/two cold sample players, valid SVG navigation, reduced motion stopping animation, and no page errors.
- Local checks covered threshold boundaries, the cold eligibility gate, defense aliases, deduplication and balancing, retaining the original deck, current-season records, and the service-worker precache graph.

The browser review verifies production components with fixture data. Authenticated end-to-end league requests, live scoring updates, and every destination route were not exercised in that fixture. The redesign is on the PR branch and has not been merged or deployed.
