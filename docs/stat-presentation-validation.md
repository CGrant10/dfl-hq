# Player and matchup presentation — v1.362.0

Player cards use a larger portrait and team-tinted identity surface. The injury status stays in one dedicated row. Recent form becomes a compact chart of the same recorded weekly fantasy scores, with exact values beneath each week. Missing scores break the line; reported zero and negative scores retain their values. Cached values remain labeled, and the current-week phase updates while the card is open. The chart is decorative for assistive technology because the adjacent definition list contains its full data.

Clubhouse compares live, upcoming and finished starters in aligned rows. The scoreboard and main faceoff show an actual-score lead cue after kickoff or for a completed matchup. Ties, absent scores and unknown/pregame status do not claim a lead. Position totals use a quiet emphasis for the higher recorded value; team totals and player scores remain the source of truth. Right-hand player scores and supporting stat lines align to the outside edge for easier comparison.

Trade receipts use a cleaner recommendation border and quieter supporting values. Send/receive totals align at the bottom even when package lengths differ. Trade recommendations, scoring, valuations, roster ownership, current names, broadcast artwork and league actions retain their existing logic.

The chart uses a single finite entrance through the shared motion controller. Motion off, reduced motion, hidden-tab cleanup, sheet closing, score refreshes and the existing faceoff/score effects keep their existing controls. New assets ship in the versioned offline shell.

## Verification

- TypeScript, identifier checks, 1,332 tests in 151 files and the production build pass. Model checks cover missing/negative/zero scores, gaps, cached values, current-week labels and actual lead guards.
- Production Home/Clubhouse browser review covers aligned lineups, long names, matchup changes, focus/disclosure preservation, score/stat refreshes and motion cleanup. New checks exercise lead flips, ties, missing scores and unknown/pregame states. The form widget is checked at 320/390/768px, six palettes and 100%/200% text.
- Production Trade review exercises real manual/proposal/counteroffer handlers and checks aligned package totals, multi-party routing, value bounds, picker behavior and saved comparisons.
- Guarded real-app verification covers phone/tablet layouts, themes, player sheets, readable form values, finite chart entrance, Motion off/reduced motion, open-card phase updates and focus return. Browser verification blocks production league writes; it does not post, vote, save a trade or place a wager.

Screenshots and browser state remain outside the repository. Physical iOS Safari is outside these browser checks.
