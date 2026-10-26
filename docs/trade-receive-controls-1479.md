# Trade receive-position controls — 1.479.0

The Trade Board now has native QB/RB/WR/TE checkboxes labelled “I’ll receive”,
plus All and RB + WR shortcuts. These remain visible beside the primary search
and do not change outgoing players or manual trade evaluation. A new visit
continues to start with all teams and all positions.

The worker filters the incoming candidate pool before generating packages and
checks every incoming player again during balancing/refinement. It applies the
same restriction to the viewing team's actual return in circular multi-team
suggestions, while allowing other teams to exchange those positions. Fair,
Aggressive, Steal, closest alternatives and their counts use a filter-specific
cache key. An empty selection stays empty with a direct recovery action.

Unchecking a position removes conflicting incoming anchors, resets a conflicting
position goal to Best fit and updates the receive-player picker. Filters survive
live data refreshes; reset/new-visit behavior remains unrestricted. Package limits,
FantasyPros evidence, position values, model thresholds and manual routing remain
unchanged.

Position changes and tier switches update offers in place, preserving the
checkboxes, intent buttons and send-player picker. Removed the delayed tier-switch
redraw that could dismiss a newly opened player picker. The existing sliding
highlight remains mounted during its transition. Rapid changes cancel obsolete
worker searches, cached searches are reused and reduced motion stays supported.

Validation: `pnpm check` (2,150 tests / 260 files, theme/release/type/name checks,
production worker and app build). The focused incoming-position suite covers
all three intents, outgoing-position independence, anchored targets, three-team
returns, old/empty drafts, live refresh and reset. Production-page browser checks
use isolated services and the real search worker. They cover Light/Dark at
320/390px, 44px targets, text contrast, retained DOM/focus/scroll, rapid filtering,
empty recovery, incoming pickers, counts, all tiers and the delayed-picker race.
[Checks and screens](trade-receive-controls-1479/checks.json).

The existing full trade workflow and connected offer/player-selection motion
checks also pass. Physical iPhone/Safari frame pacing remains unverified.
