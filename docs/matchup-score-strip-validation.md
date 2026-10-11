# Matchup score strips — v1.366.0

GameDay Watch contracts its existing pinned scoreboard after scrolling past the matchup header. Full current team names and actual scores remain readable beside the existing Matchup, Moments and League tabs. The 220 ms contraction follows the app's Motion preference and system reduced-motion setting. A stable expanded-height reservation keeps lineup rows in the same document positions while the pinned surface shrinks. Live paints preserve that reservation, scroll position, focused player and expanded disclosures; resize and font loading recalculate it. Passive scroll work is limited to one animation frame, and teardown removes the observer and listener. The close-game note stays available below the lineup instead of enlarging the pinned surface or shifting players when a game gets close.

Clubhouse adds a compact current-team score reference at the start of the selected lineup. It follows only that matchup card, pins below the shared top bar (and desktop navigation), updates from the same actual score model, and clears with route teardown. Its lead cue uses the existing actual-score and known-status safeguards. Long team names wrap without truncation.

Watch now derives its status label and live beacon from the selected matchup's starters, using the same phase function as Clubhouse. Unrelated live NFL games cannot label an upcoming matchup live. Unavailable schedule status stays pending, between-game matchups stay in progress, and official Final remains tied to completed league weeks. Existing pinned lineup-name rows return to normal flow so they cannot cover either score strip.

## Validation

- Full local check: 1,370 tests, TypeScript, identifier checks and production build passed.
- Production-controller browser coverage checks Watch at 320, 390, 768 and 1,000 pixels across six themes: contraction, stable lineup geometry, full names, 44-pixel tabs, compact refresh state, focused-player and bench preservation, selected-matchup phase, unknown/final states, Motion off and reduced motion.
- Existing Clubhouse controller coverage now includes pinned score geometry below mobile and desktop chrome, actual scores, full names, all matchups, lead changes, corrections, focus, stats, motion and cleanup.
- Read-only actual-app verification passed 50 checks over ten Home, Watch and Clubhouse layouts, including score-strip positioning, no horizontal overflow, offline/reconnect recovery, fresh score reads, focus and disclosure retention, and route cleanup. No browser exceptions occurred.

Sample-controller previews are labeled as simulated data. Actual-app browser verification blocks league writes and does not post reactions, send trades or create conversations. Runtime screenshots and saved browser state stay outside the repository.
