# Matchup interaction polish — v1.327.0

Home keeps the League Desk layout and existing artwork. A compact matchup entry shows a personal lead, deficit or completed result and opens the same season/week in Clubhouse. Upcoming forecasts never become claimed live leads; missing scores/status stay pending, and final wording requires a completed league week.

Actual team totals now have their own snapshot keys. Successful refreshes show signed gains or stat corrections without moving the score glyphs. Feedback is static with motion off or reduced motion enabled; the saved motion choice enables the existing gentle animation. Initial loads, unchanged scores, missing baselines and projections produce no gains.

Loading reserves two team columns. Manual refreshes show a busy label and prevent duplicate requests. A failure preserves the previous matchup and exposes Retry beside it; an initial failure removes the loading skeleton. A successful keyboard retry moves focus to the restored matchup link. Clubhouse uses the same score feedback and explicit refresh states. Its shared grid rows keep totals aligned when team names have unequal lengths.

## Verification

- `pnpm check`: typecheck, identifier resolution, 126 test files / 1,129 tests and production build pass.
- Real `mountGameDay` browser scenarios cover deferred forecasts, live scores, initial-load failure/retry, failed-refresh preservation, keyboard retry focus, external controls, mouse/keyboard player tabs and preservation of open disclosures.
- Real `mountMatchupLive` browser scenarios cover zero totals, no initial gain, actual gains, negative stat corrections, reduced motion, busy states, failures, retry recovery and cleanup.
- Clubhouse card captures at 320, 390 and 1280 px in light, dark and medicine palettes verify complete names, aligned totals, contained content, no horizontal overflow and 44 px controls.
- Home total-feedback checks at 320, 390 and 1280 px verify that the gain badge stays inside its team column and clear of the total.
- `tools/capture-home-review.py` runs these scenarios with the existing Home responsive/theme, full-artwork, shared-header, carousel, Wall and navigation checks in CI. Data providers for behavioral scenarios are isolated fixtures; league data is not changed.

Evidence: `home-review-output/browser-checks.json` in the Home design review artifact, including `gameDayScope` and `matchupInteractions`; card captures `matchup-{light,dark,medicine}-390.png`.

Scores retain the existing refresh interval and provider behavior. “Live” identifies active starters; totals are checked snapshots rather than a streaming feed. Pending NFL status never implies a finished matchup.
