# Offer discovery — v1.364.0

The two-team offer search previously considered only the eleven highest-valued players per roster, sampled forty packages per shape, and spent its evaluation budget mainly on similar prices. That could miss useful bench-player packages and value gaps needed by the Steal tab. Any injury flag also excluded Fair, including Questionable players whose availability risk was already priced into the model.

Two-team searches now use the full modeled roster and sample up to one hundred packages per shape. Combination ranks are sampled directly so larger rosters do not require constructing every package. The bounded evaluation budget reserves candidates for the selected intent while retaining partner and package-shape diversity. Steal pairing includes favorable price gaps alongside the existing nearest-price pairs; every candidate still passes the full trade evaluation and plausibility checks.

Balanced trades involving known Questionable players can appear as `FAIR · REVIEW DATA`. Injury discounts, uncertainty bands, and the analyzer's review requirement remain. Out, reserve, doubtful, unverified injury flags, stale data, missing projections, production fallbacks, and limited expert evidence still prevent Fair. This supersedes the blanket injury exclusion described in the v1.359.0 validation document.

Player prices and the 12-team PPR, single-QB model are unchanged. Steal still requires fresh, strong evidence, nonoverlapping value bands, useful roster impact, no injury review, no incoming QB, and no comparable-star premium. Results are estimates, not acceptance probabilities. Some anchored searches legitimately have no Fair or Steal result; the empty state explains the incoming-QB rule when applicable and avoids duplicate messages.

## Same-data comparison

Read-only current league snapshot from October 11, 2026: twelve rosters, 158 modeled players, a fresh FantasyPros PPR ROS feed, and no stale sources. Each team's three highest-valued players was individually anchored against every other roster, producing 396 searches per intent with a four-player ceiling and a 96-result limit. Both versions used the same snapshot and prices.

| Metric | Before | After |
| --- | ---: | ---: |
| Searches with a Fair offer | 143 | 235 |
| Fair offers returned | 539 | 1,556 |
| Searches with a Steal offer | 12 | 18 |
| Steal offers returned | 24 | 44 |

These are discovery counts for this snapshot, not predictions of trade acceptance. Steals remain uncommon for anchored player/team combinations. Candidate-budget clamping and package-evidence caching preserve the selected-tier rules while bounding work.

## Verification

- New regressions cover Questionable review requirements, unsafe availability and stale evidence, full-roster swaps below the former cutoff, bounded larger packages, and the incoming-QB empty state.
- The full local check passed 1,355 tests across 153 files, type checking, current-name validation, and the Arena build. Final candidate-budget and caching changes also passed targeted model checks; CI verifies the committed release.
- Production trade browser fixtures passed at 320, 390, and 768 pixels, including routing, pickers, saved deals, counteroffers, keyboard interactions, and reload restoration.
- Read-only actual-app checks found unrestricted Fair offers for all twelve current rosters and validated the Fair and Steal safeguards on every returned offer. Previously missed Derrick Henry packages now render; CeeDee Lamb Fair packages retain review labels and open a review-required analysis. Incoming Josh Allen Steals remain excluded, with one explanatory empty message. No horizontal overflow or browser exceptions were observed.

Runtime roster snapshots and screenshots stay outside the repository. Browser verification blocks writes to league storage.
