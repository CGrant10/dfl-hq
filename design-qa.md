# Quick Round fixed controls design QA

- Source visual truth: `C:\Users\GUEST\Documents\Codex\2026-08-22\this\.codex-remote-attachments\01a02a28-03bc-7100-b90c-d17b7441ff40\67708fde-b847-4258-9a18-7990cc583a44\1-Photo-1.jpg` and `2-Photo-2.jpg`, with the user's explicit direction to retain only Shots and Putts in the entry sheet.
- Implementation screenshots: `qa/quick-round-simple-mobile-v125.png` and `qa/quick-round-scorecard-mobile-v125.png`.
- Combined comparisons: `qa/quick-round-simple-comparison-v125.png` and `qa/quick-round-scorecard-comparison-v125.png`.
- Browser surface: Codex in-app browser at the local Vite preview.
- Viewport and density: 373.6 × 809.6 CSS px at device scale factor 1; implementation captures are 374 × 810 px. Source images were 592 × 1280 px and were compared at their original density against implementation captures normalized to 592 × 1280 px.
- State: Red Trail Links Quick Round, Hole 1, one golfer, existing score 6 and two putts. DFL top bar, bottom line, and five-item navigation retained.

## Findings

No actionable P0, P1, or P2 differences remain for the requested scope.

- Controls and copy: the sheet retains the reference's player header, Enter action, blue vertical steppers, and clear hierarchy while intentionally removing tee direction, miss-hit, putt distance, club, hazards, penalties, drinks, and mode buttons. “Score” is relabeled “Shots” to match the user's language.
- Spacing and layout: the compact sheet is fully visible above the bottom line and navigation. The fixed app workspace measures exactly one viewport; body scroll height equals client height and vertical overflow is hidden.
- Scorecard: the white paper treatment, blue legend band, score marks, course heading, and Golf-home back arrow remain. The table is horizontally scrollable (842 px content inside a 374 px viewport) with vertical overflow hidden.
- Typography and colors: the existing DFL type system and medicine-inspired red, yellow, white, green, and earth palette are retained. No medicine-wheel graphic was introduced.
- Image and asset fidelity: existing app logo and icon assets are retained; no source asset was replaced with a placeholder, emoji, CSS drawing, or improvised SVG.
- Accessibility: every stepper has a specific accessible label, the back control identifies its Golf-home destination, and the persistent navigation remains available.

## Full-view comparison evidence

`qa/quick-round-simple-comparison-v125.png` shows the reference control language beside the simplified implementation. The player identity, primary action, and two requested steppers remain visually aligned with the source while the removed advanced controls no longer consume vertical space.

`qa/quick-round-scorecard-comparison-v125.png` shows the source scorecard beside the fixed implementation. Both retain the same title-to-table-to-legend reading order, with the implementation keeping the existing DFL chrome as requested.

## Focused comparison evidence

The two requested controls are large and legible at phone size, with Shots and Putts centered in equal columns. A separate focused crop was unnecessary because labels, values, and controls are clearly readable in the full-size combined comparison.

## Primary interactions tested

- Existing Hole 1 score opens the compact sheet without changing production data.
- Enter closes the sheet.
- Scorecard opens the dedicated fixed scorecard view.
- The scorecard preserves horizontal scanning while vertical overflow remains disabled.
- Body metrics remain `scrollHeight === clientHeight` and `scrollY === 0` in both scoring and scorecard states.
- The back arrow still targets `#/golf`, and the five-item bottom navigation stays visible.
- Browser console showed no change-related runtime error.

## Comparison history

1. First fixed-sheet pass inherited the height of the content wrapper, placing the sheet under the app header. Fix: the Quick Round outing wrapper now fills the available viewport. Post-fix evidence places the entire 285 px sheet between the round content and persistent bottom chrome.
2. Post-fix scoring metrics show a 649.6 px Quick Round workspace inside the phone viewport, with the sheet at y=330.4–615.6 and the bottom line/navigation below it.
3. Post-fix scorecard metrics show no vertical document overflow and a dedicated 842 px horizontal score surface inside the 374 px viewport.

## Follow-up polish

No P3 follow-up is required for this scoped change.

## Final result

passed

---

# Full-hole satellite GPS design QA

## Evidence

- Source: `C:/Users/GUEST/Documents/Codex/2026-08-23/loo/.codex-remote-attachments/01a02fb4-48a5-7c92-8158-223b000a2851/719cbe15-e418-4ac4-93bb-a04e599a6e6b/1-Photo-1.jpg` (591 x 1280 px).
- Implementation capture: `work-gps-implementation.jpg` (1280 x 720 CSS-pixel viewport at DPR 1.25; GPS panel 520 x 676.8 CSS px).
- Combined comparison: `gps-design-comparison.jpg`; both views were normalized to 720 px high with aspect ratio preserved.
- State: Rolla tournament beta, member view, Hole 1, no accepted live-location reading, Add score state.

## Comparison

The implementation matches the reference's primary composition: a full-height satellite hole image, compact translucent hole navigation, a solid player-to-green line, a centered yardage pill, player and green markers, a floating GPS action, imagery attribution, and a bottom score dock. The header, line, pill, and score dock remain legible over the imagery. The implementation intentionally retains DFL typography, team identity, navy surfaces, and green scoring action instead of copying TheGrint branding or phone chrome.

The desktop panel is constrained while the mobile breakpoint fills the viewport. The implementation's course terrain differs from the reference because the two views depict different courses. Its pins also retain the existing DFL marker language. These are P3 differences only.

## Interaction and runtime checks

- Opened GPS from the member tournament screen.
- Advanced through all nine physical Rolla holes and confirmed each loaded its own imagery, line, official yardage, and fallback image; repeated-nine event numbering uses the corresponding physical-hole geometry.
- Tapped Add score inside GPS and confirmed the map closed and the existing score-entry sheet opened.
- Confirmed normal map tiles loaded with a static Esri image underneath as a visible fallback.
- Confirmed no new console errors after the final reload and interaction pass.

## Comparison history

1. Initial state — P0: a missing position was converted to zero yards, allowing the map to dereference nonexistent coordinates and remain an empty blue box. The external map loader also did not wait for both script and stylesheet readiness.
2. First corrected state — P1: imagery rendered, but framed only the published landing-target segment because that coordinate had been treated as the tee.
3. Final state: null-distance handling was corrected, the loader waits for both resources, a satellite fallback was added, and the tee is projected from the green through the published fairway target using the official hole yardage.

No P0, P1, or P2 issues remain.

final result: passed
