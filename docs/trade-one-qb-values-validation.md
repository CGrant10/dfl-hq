# 1QB player prices — v1.338.0

The previous release removed incoming QBs from Steal labels but retained their prices. This release lowers ordinary QB asset values in DFL's one-QB format. Lineup forecasts, DFL scoring and weekly gains remain unchanged.

Ordinary QBs retain 35% of their replacement-point surplus and draft ADP signal before normalization. Their weighting rises continuously from 35% to 100% when their availability-adjusted forecast exceeds the typical starting QB by between 2 and 6 DFL points per game. A six-point edge earns the full elite premium. Names do not grant an exception: a player like Josh Allen keeps his premium when his forecast supports it, and loses it when performance or availability removes the edge.

The starter comparison is the league-size-ranked QB across the available NFL forecast universe, with an 80%-of-best fallback in sparse data. The existing replacement baseline remains the league-size × 1.5 rank. Neither baseline asserts that a particular QB is currently available on waivers. Weighted surplus also determines the shared normalization ceiling, preventing high raw QB points from squeezing skill-position prices. The weighting and thresholds are explicit league-specific model assumptions, not an expert consensus or externally calibrated market price.

Every package uses the same discounted price in two-team trades, directed group trades, suggestions, saved-deal reevaluation, share totals and newly captured receipts. New receipts identify `dflyzer-trade-v4-one-qb`; frozen v3 receipts preserve asset-winner semantics and existing stored values. Earlier legacy receipt behavior is also retained. Incoming QB packages still cannot qualify for Steal.

Selected QB evidence shows Streamer discount, Starter premium reduced or Elite weekly edge. Projection context explains the policy without implying that forecast lineup points were discounted.

Validation includes ordinary QB versus useful RB/WR/TE assets, Allen-level premiums, name independence, smooth thresholds, unchanged forecast points, discounted ADP, availability, actual package accounting and v3/v4 receipt compatibility. The production Trade browser review covers 320/390/768px routing, anchors, sharing, saved deals, reload and counters. A separate read-only browser rebuilds before/after prices from the same current league inputs, checks all 12 rosters for QB Steals, and exercises the real manual trade evidence at phone/tablet widths with league writes blocked.

Current-data verification passed: Goff 16 → 6, Purdy 25 → 15 and Allen 42 → 42. All 23 rostered QB ratings stayed equal or fell; every non-QB price and every forecast point total remained unchanged on these inputs. All 12 teams returned zero QB Steals. Full checks passed: type checking, names, 1,204 tests across 132 files, and build. Both production browser checks passed without page errors or overflow at 320/390/768px.
