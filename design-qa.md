# Night Game shared images — 1.560.0

Source visual truth: `/workspace/generated_images/exec-4e113566-c065-4884-bccd-7157cc13e666.png` (selected option 2).
Implementation: `/workspace/dfl-share-1560/matchup-browser.png`, captured from the real canvas renderer in Chromium, not a static replacement.

Source 1122×1402; implementation 1080×1350 canvas pixels, browser CSS size 1080×1350, deviceScaleFactor 1. Both are normalized to 540×675 in the combined browser capture `/workspace/dfl-share-1560/comparison-final.png`. The focused score/footer comparison is `/workspace/dfl-share-1560/comparison-details.png` at 720px display width per panel. Local isolated URL: `/night-review/`, served by `tools/capture-night-share-review.py`.

State: final week 8, Bayou Bombers 136.42, Klutch Sports Group 121.88, margin 14.54, actual Sleeper Ja’Marr Chase portrait and 28.40 points. No authenticated league operations or real messages sent. The generated mock's invented full-torso player image is intentionally replaced by the real Sleeper head-and-shoulder cutout, with its native proportions and a soft lower fade. The reserved right image column prevents artwork covering names or scores. The mock's decorative date is omitted because the underlying final-share model does not supply a verified final date.

## Findings and comparison history

- Initial combined comparison: `/workspace/dfl-share-1560/comparison-final-01.png` and `comparison-details-01.png`. [P2] Main result word, team rows and banter were smaller than the selected reference, leaving excess space before the footer. Increased matchup title to 122px with a 148px result word, row names to 44px, and banter to 80px. The new layout keeps each long word together by fitting it before wrapping.
- The second comparison showed two closely spaced bottom rules. Removed the redundant rule below the margin and captured the same content again.
- Final combined captures above were opened and inspected together. No actionable P0/P1/P2 findings remain. Real portrait framing and absence of an unverified date are expected product constraints, not assertions of pixel-identical generated imagery.

## Required fidelity surfaces

- Typography: local variable Inter, weight 900 headline/numerals, 700 names, quieter supporting labels. Bold non-condensed letterforms reflect the chosen clean grotesk direction. Long names/context wrap; numeric values fit their reserved column. Unicode player names render correctly. Source headline proportions now carry into the result and footer. The mock's variable generated glyph shapes cannot be reproduced exactly by a real font.
- Spacing/layout: 64px side margins, aligned full-width score rules, separate image/text tracks, dominant final score, compact metadata. Portrait outputs retain the 4:5 minimum frame; longer trades/tickets expand to retain explicit routes, omitted-item counts or full details. Wide golf scorecards retain their table and scoring marks.
- Colors/tokens: charcoal, off-white, deep red, soft stadium lights and yellow margin match the selected direction. The new 42KB generated stadium asset fades into the background with no rectangular glow edge. Export art is consistently dark in either app theme; preview controls use existing shared Light/Dark tokens. Semantic hit/miss marks retain green/red, with explicit words as well as color.
- Image quality: actual round DFL asset; no shield or mascot substitution. Generated stadium has no embedded text or logos. Real portraits keep aspect ratio, sufficient resolution for this source, reserved spacing and soft alpha fade. No fictitious player bodies are generated at runtime.
- Content: actual scores, names, player credit, margin and league footer retained. Trade packages retain every direction and original balance/confidence facts. Settled, pending and refunded tickets remain distinct; a ten-pick provisional loss cannot become a paid win. Compact omissions are counted, full exports retain all items. No valuation changes.

Wide golf inspection also found left-aligned headers above centered scores, stretched stadium lights behind metadata and an unnecessarily tall frame. Centered each heading over its value/mark, retained the artwork aspect ratio and restored a 1600×900 minimum frame. The revised `/workspace/dfl-share-1560/table-compact.png` was opened and inspected; its extra alignment/frame browser check passes.

## Interactions and responsive verification

71 isolated browser checks pass at 320/390px in actual Medicine Wheel Light and Dark, including default design, persisted Clean choice, 44px controls, no horizontal overflow, usable no-photo cards, failed-photo fallback, full ten-pick pending result, stale render protection, close/focus restoration, route teardown and synchronous native share activation. Full/compact trade, ticket, profile, recap plus matchup/tie, keeper, highlight and golf exports are rendered and checked for text bounds and photo separation. Mobile captures: `/workspace/dfl-share-1560/preview-{320,390}-{light,dark}.png`; exported cards in the same directory. No uncaught browser errors.

The inherited full trade review initially expected stacked packages below a 600px viewport. Its assertion now verifies aligned totals after readable rows for either valid container-based layout; the existing complete review passes at 320/390/768px, with no overflow or uncaught errors. This changes the old test, not the trade UI.

Existing Sportsbook result controller regression: 48 checks pass, including both Clean/Night Game exports, losing sixth leg and pending official payout. Native sharing/download are mocked; physical iOS share-sheet appearance and font rasterization are not measured. Static exports have no motion; existing preview focus behavior is preserved.

Implementation checklist: selected art applied; actual photos and logo retained; semantics and fallbacks verified; mobile themes inspected; typography/dividers corrected; final combined comparison reviewed. No further blocking fixes.

final result: passed
