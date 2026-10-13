# Sportsbook portraits and More sheet — 1.405.0

The featured Sportsbook matchup set `.sb-team-mark` to `position:static` even though its photo and picked indicator are absolutely positioned. They therefore used the outcome button as their containing block. Both featured and ordinary marks now establish their own containing block.

More keeps its card opaque and its backdrop steady during entry, with a transform-only slide. Fresh openings reset the sheet scroll before entry; initial focus does not scroll the animated surface. Reopening during dismissal continues from the current transform and opacity, cancels the stale completion, and keeps focus return tied to More. Overscroll stays within the sheet.

Guarded Chromium review against the actual local app passed 48 checks at 320, 390 and 768px. A local photo fixture and missing-image fixture exercise the shared production portrait renderer; the image and selection overlay stay inside the 48px mark, and a missing photo keeps its initials. Motion on, app Motion off and OS reduced motion all pass stable-scroll, opaque-entry, initial-focus, focus-return and scrolled-reopen checks. Rapid reopening during dismissal remains open; choosing Arena closes the sheet and navigates. No page errors. Business writes were blocked, and no bets, syncs or race edits were performed.

Artifacts: `/workspace/dfl-ui-fixes-1405/` (before/after screenshots, frame samples, guarded review and check logs). This is Chromium viewport validation; physical iOS compositor behavior remains a device check.
