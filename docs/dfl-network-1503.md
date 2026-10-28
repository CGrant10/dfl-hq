# DFL network experience — 1.503.0

## Matchup timeline

Clubhouse matchup highlights now include an expandable timeline with All,
Lead changes and Plays filters. Moments run oldest first; selecting one shows
its recorded scores or play facts. The selected moment and native rail position
survive new updates. Earlier highlights use the existing scoped pagination.

Lead scores come from server-saved `gameday_moments`, not an inferred curve.
The live database read found 49 saved lead samples for 2026. Sync observations
say “Saved”; verified NFL plays use their actual play timestamp. There is no
invented opening score, continuous history, causal turning point or comeback
size. An exact active game/play clip opens in the existing viewer; otherwise
the link opens that NFL game's play-by-play. Expired clips retain the receiver's
existing fallback. Video metadata loads only when the timeline is opened.

## Sunday desk

Clubhouse → NFL live adds up to three pinned NFL games above its shared game
center. Each tile shows scores, game state, involved offensive players and its
latest available play. Own players lead, then matchup opponents, then other
rostered players. Tapping a tile selects the existing play-by-play/stats panel.

Pins are scoped to member, season and week on this device. Edit games retains
an intentional empty list and blocks a fourth pin. The desk reuses the existing
scoreboard polling and summary cache; at most three pinned summary reads run
together. It creates no independent timer. Hidden tabs suspend refresh, a final
featured game keeps checking other live/upcoming pins, and the shared loop stops
when no pinned game remains pending. Provider failures retain available context.

## Banter with receipts

The expandable DFL file on a matchup uses deduplicated earlier matchup records,
actual completed bench comparisons, and up to twelve recent graded trade
receipts. Each fact links to its archived matchup or exact trade receipt.

Current team labels follow matched owner IDs. Ties break streaks; current and
future weeks cannot become past streaks. A season losing streak already explained
by the same rivalry is omitted. Bench comparisons require known scores and an
eligible starting slot. Trade banter explicitly describes a **saved trade-day
value estimate**, excludes review/uncertain receipts and never substitutes a
claim about later performance. Missing evidence yields no fabricated roast.
Trade enrichment runs independently so rivalry history never waits on it.

## Opportunity scout

Trade → **Scout** opens a compact shortlist without moving the first default
offer below the phone fold. At most three different partners make the list.
Both projected starting lineups must improve by at least 0.2 pts/week, value
balance must be at least 85%, and evidence cannot require review. Negative
roster impacts, required drops, IR/season-ending players, ownership mismatch
and a manager's Keeping players disqualify a scout pick.

The scout uses the current search, positions, horizon, manager intentions and
automatic refresh data. It doesn't add a new valuation model or weaken Steal
criteria. Both complete packages, balance and each side's projected gain appear
together; Review uses the existing full trade evaluator. Empty results are
honest. Member/season-scoped local snapshots can show a measured roster, status
or value change since an earlier scout visit, never a guessed market move.
There is no new background push or automated offer submission.

## Event presentation

Final whistles, trade receipts and weekly awards share a small DFL wordmark,
editorial rules, tabular numbers and clear headline/metric hierarchy. Finals
retain the existing finite team/score reveal; awards and wordmark rules get short
opacity/transform entrances. Reduced motion and Motion off keep static content.
All surfaces use shared Medicine Wheel tokens. No shield artwork was added.

## Validation and limits

- `pnpm check`: **2,349 tests / 284 files**, release consistency, themes,
  typecheck, names and the production build. Startup remains 3 modules, Home 4.
- `tools/capture-dfl-network.py`: 96 checks across 320/390/768 and Light/Dark,
  actual controllers with isolated data, timeline selection/refresh/exact clip,
  pin limits and game selection, record links, full-model two-way scout and
  ticket opening, targets, overflow and reduced motion.
- `tools/capture-nfl-live-refresh.py`: 44 checks including final featured games
  with other upcoming/live pins, automatic cadence, suspension and cleanup.
- Existing Trade, Clubhouse, finish and recap browser suites passed. Actual
  screenshots inspected in both themes; selected evidence is in
  `docs/dfl-network-1503/`.
- The live database inspection was read-only. No schema/API/permission changes,
  test pushes, wagers, trades or league records were created. Browser fixtures
  use representative portraits and fabricated league/game data, not claimed
  live NFL footage.

Physical device frame pacing, OS haptics and screen-reader speech remain
unverified. Scouting depends on available model evidence; it does not promise
that another manager will accept. Timeline coverage is limited to recorded
moments; archived results are not a continuous play history.
