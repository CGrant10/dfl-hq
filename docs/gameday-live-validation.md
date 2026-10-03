# Home GameDay — v1.267.0

Home now includes a compact GameDay panel above power rankings. It shows the selected member’s actual matchup score, player photos and recorded starter points, league leaders, a short highlight feed, and the NFL scoreboard. Four player rows are visible initially; the remaining submitted starters expand in place.

Sleeper weekly matchup rosters supply actual fantasy points. ESPN supplies NFL game phases and scores, validated against the selected season and regular-season week. Home follows the latest synced Clubhouse week. Data refreshes once per minute while Home is open and visible; Refresh bypasses the roster and NFL caches. Clubhouse shares the NFL status loader. Missing NFL status is labeled unavailable, and failed refreshes preserve the last recorded scores.

Highlights are derived from recorded stats, not news reports: a changed non-tied matchup leader, a player gaining at least six points since the last check, and a starter reaching twenty points. Initial loading can show existing twenty-point days but cannot invent a score jump or lead change. Highlights include observation times. Bench players are excluded. No push notifications, sounds, or outbound messages are sent.

Brief score-change animations, a live beacon, and a finite pregame glow add motion. A persistent member-scoped Motion toggle and the system reduced-motion preference disable animations. Native tabs support arrow keys, Home, and End; expanded lineup state and keyboard focus survive refreshes.

Validation:
- Eight model tests cover starters, missing scores, highlight thresholds, unchanged data, corrections, ties, guest identity, and kickoff countdowns.
- Browser checks at 320, 390, and 1280 pixels; Dark, Medicine, and Fairway themes; enlarged text; no horizontal overflow or automated WCAG A/AA findings.
- Player images load, Home power rankings stay visible, keyboard tabs work, expanded lineup survives refresh, and motion preference persists.
- Controlled live-game fixtures verify lead changes, scoring jumps, big days, unchanged refreshes, reduced motion, and retaining scores after a failed refresh.
- Browser validation blocks production writes and uses read-only data or local fixtures.
