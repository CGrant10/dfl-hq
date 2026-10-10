# Fair offer discovery — v1.359.0

The Fair tab previously rejected balanced exchanges unless both rosters gained almost the same points. Any expert disagreement, split, or limited sample also moved an otherwise balanced offer to Aggressive. A three-tier quota spent much of the selected tab's result limit on offers that the page then hid.

Fair now requires at least 90% asset balance, useful incoming players for each roster, roster impact of at least −0.75 for each owner, and no more than a 1-point weekly lineup loss. Different gains are allowed: roster needs differ. Missing projections, production fallbacks, injuries, stale inputs, missing expert matches, and unavailable expert feeds still exclude an offer from Fair. Expert disagreement and limited samples remain review flags, shown as `FAIR · REVIEW DATA`; analyzing those offers still asks for review.

The selected intent receives the full result budget before other categories. Shape and partner diversity remain. Multi-team Fair uses the least-balanced participant and the weakest roster/weekly impact, rather than checking only the first owner. Fair scoring rewards overall balance and mutual roster benefit.

Player prices, PPR settings, 1QB discounts, quarterback exclusions from Steal, sensitivity-band requirements, and frozen receipt interpretations are unchanged.

## Same-data comparison

Read-only current league snapshot: October 10, 2026; 12 rosters, 158 modeled players, fresh FantasyPros PPR ROS feed, no stale data sources. Results are estimates, not accepted-offer probabilities.

Across 396 searches (each team's three most valuable players, individually anchored, against each other manager; four-player ceiling, 96-result limit):

| Metric | Before | After |
| --- | ---: | ---: |
| Fair offers returned | 237 | 561 |
| Searches with at least one Fair offer | 85 | 143 |
| Searches without a Fair offer | 311 | 253 |

Example: Jaxon Smith-Njigba anchored from roster 3 to roster 10 previously showed no Fair offers; it now returns three. These figures use the same players and values in both runs. No trade has been sent or saved to league storage.

The multi-team comparison also removed six previously mislabeled Fair exchanges that failed another owner's balance or roster constraints. Three-team exchanges often still have no Fair option; the app does not force one into the results.

## Verification

- Model regressions cover unequal roster gains, unchanged value thresholds, review flags, unavailable/unsafe inputs, small result limits, selected-tier budgeting, every owner's balance, and multi-team priority.
- Existing player valuation, confidence, filler-package, and 1QB Steal safeguards remain covered.
- Production-page browser checks cover Fair review labels and mobile overflow at 320, 390, and 768 pixels, alongside the existing picker, routing, saved-deal, counteroffer, keyboard, theme, and enlarged-type checks.
- Real-roster browser checks validate supported Fair results and zero incoming-QB Steals across all 12 teams; recovered anchored offers open the analyzer with review preserved.

Browser verification blocks writes to league storage. Runtime snapshots and screenshots remain outside the repository.
