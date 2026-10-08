# 1QB offer labels — v1.337.0

DFL starts one quarterback. No package containing an incoming QB can be labeled Steal, including an elite QB or a QB added to an otherwise qualifying mixed package. This rule applies to the primary owner's actual incoming package in two-team trades, circular group trades and explicitly routed trades. Another member receiving a quarterback does not disqualify a primary owner's eligible RB/WR/TE return.

QB prices and genuine starting-lineup improvements remain in the analysis. This release changes Steal eligibility, not player-value calculations or frozen receipts. Fair classification still follows the existing checks. Other target-driven offers fall under Aggressive; its copy now asks users to check price and fit rather than assuming every offer is an overpay. The offer search and projection context explain the 1QB rule.

Validation:

- Eleven regressions cover Jared Goff, Josh Allen, mixed packages, retained RB/WR/TE eligibility, actual recipients and reordered group members. The QB fixtures clear the other Steal thresholds, so the assertions specifically verify the new gate.
- Replaying the previously captured current DFL data across all 12 rosters reclassified all 29 former QB Steal offers. Zero incoming-QB Steals remained; 70 non-QB Steals remained available.
- Full checks passed: type checking, names, 1,196 tests across 131 files, and build.
- The production Trade browser review passed at 320, 390 and 768px, including anchors, actual group routing, sharing, saved comparisons/reload, counters, stale ownership and expanded evidence. No overflow or browser errors.
- A separate read-only browser loads current league data and verifies all 12 teams' Steal searches, Pickens-for-Goff exclusion, the visible 1QB explanation, and continued QB offer analysis outside Steal. League writes are blocked during this verification.
