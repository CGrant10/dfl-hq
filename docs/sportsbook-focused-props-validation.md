# Sportsbook focused player board — 1.409.0

The player board displays at most ten offensive players per NFL event and two available primary markets per player. Team metadata selects QB1, RB1, WR1–2 and TE1 by the provider's primary yardage/reception line, with game-wide positional limits when team metadata is absent. TD-only bench markets are excluded. This is display curation, not an expert ranking or a change to the provider's probabilities.

QB lines prioritize passing yards and passing TDs. RBs prioritize rushing yards and scoring TDs, falling back to receptions when needed. WR/TE lines prioritize receptions and scoring TDs. Missing lines are not fabricated. Core-market deduplication and provider prices remain unchanged. Existing slips, tickets, market updates and automatic grading keep their original market/outcome identities.

Each player has one identity header and two compact stat rows with Over/Under prices. The six-menu drawer is replaced by search, position and favorites. Counts report players and lines. Commissioner feed/import tools move into a closed disclosure below the board. Matchup portraits, Pick'em and share cards are preserved.

Validation:

- Selection tests cover per-team role limits, two-line caps, excluded defensive/TD-only players, deterministic ordering, independent games, absent position metadata and original market preservation.
- Full `pnpm check` covers release versions, TypeScript, identifier validation, test suite and production builds.
- Guarded browser checks run the actual app with isolated provider fixtures: lazy game hydration, ten player/twenty line cap, search/position/favorites, empty search, original odds in slip, and button/label bounds at 320, 390, 430 and 820px.
- Real league writes, wager placement, claims and feed sync are blocked during browser review. The live data had no open prop markets at review time; fixtures validate the populated board without seeding league data.

Review artifacts are retained in `/workspace/dfl-sportsbook-1409/`.
