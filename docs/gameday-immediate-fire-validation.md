# GameDay immediate fire — v1.275.0

Actual player scores above 15 trigger fire immediately, even before halftime or when NFL status is delayed. Scores below 10 trigger frost only after the player's game reaches Q3 or finishes. Scores from 10 through 15 remain neutral. Missing scores remain neutral.

Team scores above 120 trigger fire immediately; 100 through 120 show steady. Team frost below 100 waits until every known submitted starter's game reaches the second half or finishes, or the league week is complete. Later kickoffs and unknown game status keep low team totals neutral.

Validation: 1,013 tests across 112 files, typecheck, identifier checks, and build passed. Read-only browser fixtures verified immediate fire in Q1 and halftime, frost only in Q3 or completed games, team timing, player spotlights, Motion settings, reduced motion, accessibility, and enlarged-text score bounds. Production writes were blocked during browser checks.
