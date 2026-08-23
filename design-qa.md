# Quick Round scorecard and controls design QA

- Source visual truth: `C:\Users\GUEST\Documents\Codex\2026-08-22\this\.codex-remote-attachments\01a02a28-03bc-7100-b90c-d17b7441ff40\67708fde-b847-4258-9a18-7990cc583a44\1-Photo-1.jpg` and `2-Photo-2.jpg`
- Implementation screenshots: `qa/quick-round-scorecard-v124.png` and `qa/quick-round-controls-v124.png`
- Combined comparisons: `qa/quick-round-scorecard-comparison-v124.png` and `qa/quick-round-controls-comparison-v124.png`
- Browser surface: Codex in-app browser at the local Vite preview.
- State: Square Butte Creek Quick Round, Hole 1 for detailed controls and Hole 2 for the group scorecard, one golfer, DFL top bar and five-item bottom navigation retained.

## Findings

No actionable P0, P1, or P2 differences remain for the requested scope.

- Structure: the scoring sheet matches the reference hierarchy: player header and Enter action, score and putt steppers, tee-shot direction, first-putt distance, club selection, bunkers, penalties, drinks, and Basic/Advanced modes.
- Scorecard: the implementation uses the reference's white scorecard surface, sticky golfer column, hole/par header, score-result marks, blue legend band, and an explicit back arrow to `#/golf`.
- Gesture: a horizontal finger-style drag moved the visible scorecard from Holes 1–4 to Holes 5–8 while the golfer column stayed pinned.
- Navigation: the existing DFL application navigation remains visible; the scorecard's own back button returns directly to Golf home.
- Theme: medicine-inspired red, yellow, white, green, and earth tones remain color-only. No medicine-wheel image or logo was introduced.
- Responsive behavior: the detailed panel is vertically scrollable so all advanced fields remain reachable above the fixed bottom navigation.

## Full-view comparison evidence

The scorecard comparison confirms the same primary reading order as the source: title and course, wide hole grid, player scores, then legend. The implementation intentionally retains DFL chrome and presents all golfers as rows in one swipeable group table.

## Focused comparison evidence

The control comparison confirms the same scoring actions and grouping. Existing DFL icons were reused for direction controls. Browser runtime errors: none; one pre-existing Supabase warning about multiple auth clients was observed and is unrelated to this change.

## Primary interactions tested

- Scorecard toggle opens the dedicated scorecard page.
- Back arrow targets `#/golf`.
- Pointer/finger drag scans horizontally across holes.
- Existing Hole 1 score opens in the score sheet without changing production data.
- The Advanced section remains reachable by vertical scrolling.
- Bottom application navigation remains visible.

## Comparison history

1. First scorecard pass left the scoring header visible above the dedicated scorecard. Fix: scorecard mode now hides the redundant round header while retaining app navigation. Post-fix comparison shows the scorecard title and back arrow at the top of the content area.
2. First table pass used dark cells. Fix: the group table now uses the reference's white paper treatment and colored score marks.
3. First scoring pass exposed only strokes. Fix: the panel now includes every requested control group and persists those per-hole details.

## Follow-up polish

No P3 follow-up is required for this scoped change.

## Final result

passed
