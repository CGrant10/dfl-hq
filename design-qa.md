# League Desk Home design QA

final result: passed

Selected visual truth: Option 2, **League Desk**, the second displayed image from the latest ideation set: `/workspace/generated_images/exec-2571eaac-f3a4-4386-8361-b03fc5c315a3.png`.

Implementation: `/workspace/dfl-design-audit/league-desk-target-final.png`.
Full comparison: `/workspace/dfl-design-audit/league-desk-compare-final.png`.
Focused comparisons: `/workspace/dfl-design-audit/league-desk-compare-matchup.png` and `/workspace/dfl-design-audit/league-desk-compare-broadcast.png`.

The source is 853 × 1844 px. It was normalized to the 390 × 844 CSS viewport and compared with a browser screenshot at 390 × 844 px, deviceScaleFactor 1. Source and implementation appear in the same comparison image. State: Home, dark theme, Week 5 upcoming, submitted lineups, matching-week projections 124.8 and 118.2, paused opener. These numbers exist only in the review fixture; production uses the current league models.

## Findings and comparison history

- **P2, initial implementation:** inherited margins added a second gutter around the matchup; the broad type stack and filled panels obscured the selected hierarchy. Removed inherited slot margins, moved the detailed game-day controls below the broadcast, and replaced panel boundaries with section rules. Evidence: `league-desk-first.png` → final comparison.
- **P2, initial broadcast:** the tall deck left excessive empty space above the opener, and the illustration did not fill its region. Aligned opener content to the top, fitted the existing raster artwork to the frame, and tightened the secondary slide rhythm while retaining readable text. The 390 px fixture deck reserves 307 px consistently for all 14 slides. Earlier comparison: `league-desk-compare-v2.png`; post-fix: final broadcast comparison.
- **P2, intermediate composition:** 54% copy width overlapped the 50% illustration region on narrow screens. Limited illustrated copy to 46%; retained complete, contained champion/chip/logo subjects at 50% with 0.64 opacity. The browser gate verifies image containment and no copy overlap at 320, 390, 768, 1000 and 1280 px.
- **P2, intermediate density:** the lineup caption wrapped onto two lines at 390 px, and redundant space below the scores pushed weekly tools too far down. Restored the native boxy font at 14 px for supporting copy, reduced the score-to-action gap, and kept the action 46 px tall. The final caption fits on one line at 390 px and wraps naturally on smaller phones. Evidence: `league-desk-compare-v3.png` → final matchup comparison.
- **P2, intermediate control placement:** the game-day watch target overlapped its phase label. Kept a 44 px target at the edge and placed the phase beside the week. The final browser capture shows separate bounds.

No actionable P0/P1/P2 findings remain.

## Required fidelity surfaces

- **Typography:** the native self-hosted Rajdhani face supplies boxy headings, names and readable supporting text; Anton supplies score and broadcast emphasis. The Home title is 38 px at 390 px, player/team names wrap completely, captions are 14 px and metadata is 12 px. Secondary broadcast display text stays at least 28 px and body text at least 15 px. No synthetic score stroke or pixel display font returns.
- **Layout:** dated masthead → personal matchup → one lineup action → illustrated broadcast → weekly tools → standings/news → archive → Wall. The 16 px gutter is shared. Section rules replace the stack of outer cards. All controls remain reachable above the persistent navigation when scrolled into view; rotation does not move neighboring sections.
- **Colors:** Home inherits the same theme tokens as Trade and Sportsbook. Native shell colors intentionally replace the generated mock's ambient backdrop. Six palettes pass rendered text-contrast checks. Actual/final team totals stay neutral, and forecasts have explicit labels.
- **Imagery:** the existing receipts opener is reused. Champion, chip-eater and DFL logo subjects remain contained, translucent and free of a paint layer. Archive images remain real rasters; Wall uploads retain their complete natural aspect ratio. Real profile images are used when available; the browser fixture's missing photos exercise the existing initials fallback instead of inventing team logos.
- **Copy/content:** production dates, team names, records, status and numbers come from the real models. Projections appear only for an upcoming matchup with matching season/week and both submitted lineups. Live/final scores, missing forecasts and unknown status retain honest actual-score presentation. Primary navigation and the original broadcast actions remain functional.

## Browser evidence and interactions

`tools/capture-home-review.py` passes with `/workspace/dfl-review/browser-checks.json` as evidence: responsive layouts, 14 slides across six themes, next/previous/dots/pause, section jumps without sticky selection, expanded weekly and player tabs, standings expansion, full archive/Wall content, notification badges, shared 44 px top bar, bottom navigation and reduced-motion/phone-density effects. Console errors: none.

The real `mountGameDay` function also passes isolated browser scenarios for deferred forecasts, controls mounted in the weekly desk, mouse and keyboard tabs, refresh, motion, both watch entry points and preservation of open disclosures. Providers are read-only fixtures; no league data is changed.

`pnpm check` passes: typecheck, name resolution, 126 test files / 1,124 tests, production build.

## Accepted production constraints

The shared top bar and six-route bottom navigation stay native and consistent across pages. The production carousel reserves enough space for every full slide, including longer news/trade copy, so its 307 px fixture frame is taller than the generated opener alone. Existing artwork and real profile data take precedence over generated sample logos. The lower sections retain working production features absent from the single-screen mock.

## Implementation checklist

- [x] Resolve the second displayed image and preserve its matchup-first composition.
- [x] Reuse supplied art and native icons/fonts.
- [x] Preserve model-driven scores, names, status and navigation.
- [x] Correct P2 findings and recapture the same viewport/state.
- [x] Pass responsive, theme, interaction and app checks.

## Follow-up polish

P3: very long league-written broadcast copy can increase the reserved frame beyond the review fixture's 307 px. Complete text and stable scrolling are retained.
