# GameDay halftime checkpoint — v1.274.0

Player score effects begin in the second half, rather than using early points or waiting until final for frost. ESPN's validated scoreboard period supplies the checkpoint: live periods three and later qualify, including overtime. Q1, Q2, the halftime break, upcoming games, and unknown period/status do not qualify. Final games remain eligible. Actual player and team thresholds are unchanged.

Team effects begin when every known submitted starter's game has reached the second half or final. Later kickoffs and unknown game status keep the team neutral. A completed league week remains eligible. The same checkpoint reaches My team, Opponent, Leaders, Bench, and player spotlights through the shared matchup model; matchup scores and remaining-player counts are unchanged.

Validation: 1,012 tests across 112 files, typecheck, identifier checks, and build passed. New tests verify ESPN periods, halftime-to-Q3 propagation, live player fire/frost boundaries, final/overtime behavior, team lineup readiness, later kickoffs, and missing status. Read-only browser fixtures verified no effects in Q1 or halftime, fire/steady/frost after Q3, final fallback, Motion settings, reduced motion, themes, mobile/desktop, spotlights, and enlarged-text score bounds. Production writes were blocked.
