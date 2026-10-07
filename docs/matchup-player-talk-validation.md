# Matchup player and conversation polish — v1.328.0

Key starters use 28px portraits and explicit 14px Rajdhani names, with smaller position/team metadata. Full names wrap normally; the inherited 16px interactive name no longer splits Montgomery onto a one-letter final line. Player-card buttons retain their 44px height, portraits retain their existing image fallback, and injury indicators remain visible.

Quiet matchup conversations use a single footer row with a neutral empty message and the existing start/join action. The nested background box, extra padding, zero-reply count, and repeated prompts are removed. Actual replies use a full-width excerpt with the author and a positive reply count. Loading and unavailable previews remain distinct from an empty conversation. All member content is escaped, and excerpts retain the existing 160-character limit.

Starting a conversation still requires the selected profile and the same `clubhouse_open_thread` RPC. The button now exposes a busy state and reports failure in the card's status region; retry clears the previous error. Score providers, reply queries, permissions, and league data are unchanged.

Validation: `pnpm check` passes 126 files and 1,129 tests. The real-module browser checks exercise 320px, 390px, and 1280px layouts in light, dark, and medicine themes; complete player names, aligned totals, overflow, and 44px targets; quiet and active conversations; escaped reply content; preview failure/recovery; and profile-required conversation start, busy, failure, and retry using isolated providers. Quiet conversation footers measure 57px in every tested layout. Existing Home/score browser checks and the required PR workflows remain in place. No league posts, replies, or votes are written during verification.
