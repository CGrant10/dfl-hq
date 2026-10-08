# DFL voice — v1.331.0

DFL should read like a polished league app with a group-chat personality. Keep navigation, forms, score labels and error recovery clear. Put the uncensored voice in matchup commentary and existing trade verdicts. One receipt and one punchline are enough; stronger language belongs to the event, rather than every button on the screen.

## Implementation

Home and Clubhouse now share a deterministic matchup voice. Commentary rotates by season, week and matchup; routine refreshes keep the same punchline within a scoring band. Pregame copy uses previous head-to-head meetings and streaks when available. Missing history gets generic matchup copy. A live lead explicitly says it is still playing. Only completed weeks with both scores receive final-result roasts, with separate treatments for a close loss, a blowout and a tie. Zero is a valid score; missing totals remain ungraded. Historical comparisons exclude current/future weeks and incomplete score pairs.

Home places the featured matchup's DFL chirp beside the score area, outside player-control disclosures, with a direct link to matchup conversations. A selected member's game takes priority; guests see the first scheduled matchup with its teams named. Expanded trackers retain the other games. Clubhouse shows a compact commentary block after scores/key starters and before rivalry history and member conversation previews. Async history enrichment preserves the latest checked score evidence; it does not rewrite the award model or author a Wall post.

The shared treatment uses a quiet accent rule, an 11px label, 12px evidence and 14px punchline. Links retain 44px touch targets. It uses existing theme colors and boxy typography. Broadcast artwork, share cards and the existing blunt trade analyzer voice stay intact. Team names and commentary are escaped before rendering.

## Verification

Model tests cover past-only streaks, deterministic rotation, selected-member ordering, missing history/totals, incomplete historical scores, finality, reversed winners, zero scores, ties, live updates and escaped markup. Production-origin browser checks use local proposed assets with live read-only data before merge, then public assets after deployment. Home and Clubhouse are checked at 320, 390 and 1280px for readable commentary, no document overflow, touch targets and retained first-score visibility. Production writes are blocked. Physical devices and assistive technology were not exercised.

The repository check runs TypeScript, identifier validation, the full test suite and Arena build. Home design review runs at the exact PR head across themes and responsive widths before merge. Release metadata and service-worker cache include the new module.
