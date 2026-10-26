# Trade positions and value freshness — 1.481.0

Position checkboxes apply to every outgoing and incoming player, including all
legs of multi-team suggested trades. Candidate generation, Fair balancing and
Aggressive/Steal refinement enforce the same whitelist. Excluded anchors are
cleared on both sides; both player pickers offer only selected positions. The
manual Check a trade draft stays independent. Existing saved field names remain
compatible, and a new search still starts across all teams and positions.

The control updates checkbox, native-select and picker-trigger nodes in place.
No picker remount or whole-form replacement occurs when positions change.

## Valuation freshness

- Current-season production and weekly availability: 60-second cache budget.
- Player metadata and season projections/ADP: five-minute budget, replacing the
  former daily metadata and six-hour season-projection cache in this model.
  Compact server metadata remains preferred to a full NFL catalog download.
- Published FantasyPros PPR ROS facts: checked by the visible analyzer on its
  one-minute refresh; upstream publication job now checks every thirty minutes.
  This release also includes the source publication from October 26, 2026,
  16:32:29 UTC (358 players, eight experts).
- Final trade recheck bypasses player/projection/stat caches and rechecks expert
  facts. A stronger player-data request cannot inherit a weaker in-flight cache
  read. Expired Sleeper requests revalidate the HTTP cache as well.
- Offer revision detection includes unrounded forecasts, usage, consistency,
  injury availability, expert facts, replacement options and schedule changes.
  Retrieval timestamps alone do not redraw unchanged reports. Repeated waiver
  options are serialized once to keep revision checks small.
- An explicit healthy weekly injury status clears older metadata; actual roster
  IR remains authoritative. Existing 12-team PPR, 1QB scarcity rules and honest
  Fair/Aggressive/Steal classifications are unchanged.

Source updates can lag actual games. This does not manufacture new expert
opinions, promise real-time expert publication, or silently upgrade stale facts.
The existing age/season/scoring checks and final-sharing safeguards remain.
Visible refresh still waits for scrolling, typing and dialogs to settle, retains
search choices, and wakes on sync/foreground/reconnect.

## Validation

`pnpm check`: 2,176 tests across 262 files; release, theme, type, identifier and
production build checks passed. Build remains 85 modules, three startup modules
and four Home modules. Python expert ingestion tests: eight passed.

Production page handlers and compiled search worker passed 84 mobile position
checks in Light/Dark at 320/390px: every tier/closest offer on both sides, both
pickers, conflicting anchors and goals, retained DOM/focus/scroll, rapid toggles,
empty-selection recovery, 44px controls, 4.5:1 text contrast and reduced motion.
All eight all/filtered screenshots were captured; filtered screenshots at all
four size/theme combinations were visually reviewed. Evidence is retained under
`/workspace/dfl-trade-review/receive-controls/`.

Connected offer and player-picking motion checks cover focus return, reduced and
app-disabled motion, explicit three-team recipients and teardown without leftover
portrait layers. Broader trade-flow regression results are recorded in
`/workspace/dfl-trade-review/trade-review.json` after the current run completes.
Native installed-device behavior is not directly exercised by Chromium.
