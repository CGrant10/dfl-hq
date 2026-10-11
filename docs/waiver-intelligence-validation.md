# DFL waiver intelligence — v1.370.0

The existing Team Analyzer roster coach now includes league pickup demand, potential competing roster fits and useful recent drops. The main pickup stays prominent; extra detail and the drop watchlist expand on request. Refresh updates advice and preserves each expanded detail and keyboard focus.

## League context and evidence

DFL currently uses priority waivers, with twelve valid waiver positions. Its synced pickup records are free-agent transactions and contain no winning FAAB bids. The production UI therefore shows waiver order and observed position demand, without inventing bid prices.

The loader reads completed waiver/free-agent transactions from the current season and latest four weeks, capped at 600 stored records. Current-week public Sleeper transactions supersede the synced copy, including changed transaction status. Only completed, valid transactions dated no later than the current time count. Failed sources or a capped result are labelled as partial history; total history failure leaves the original pickup advice available.

Potential competing teams are estimates based on legal nine-slot, one-QB lineup improvement, not knowledge of private claims. They use current team names, submitted starters, reserve/taxi exclusions, known projections and kickoff locks. Missing projections suppress the estimate. A team must gain at least 1.5 projected lineup points to appear. Priority order is shown only when available.

Recent drops must still be unowned across every active, reserve and taxi roster, have a verified upcoming kickoff, be healthy and improve this team's legal lineup by at least 1.5 points in an available projection week. The watchlist shows at most three drops from the last seven days. Existing pickup/drop protections remain in place.

For an actual FAAB league, at least five same-position winning bids and complete history are required to adjust the existing value-based guide. The historical range uses the 25th–75th percentiles; the adjusted guide weights the existing range 60% and history 40%, capped at twice the original upper guide and the remaining budget. The UI labels this as guidance rather than a winning-bid prediction.

No schema, authentication, scheduled job or backend function changes are required. The new reads use the existing transaction table and public Sleeper API.

## Validation

- Full project checks: 1,457 tests across 170 files, plus identifier, type and build checks.
- Focused waiver checks: 30 tests covering normalization, optional-source failures, current ownership, kickoff locks, one-QB roster fits, priority and FAAB evidence, bounded budgets and escaped HTML.
- Real-app browser checks: 99 checks with no page errors at 320, 390 and 768 px, including visible pickup history, priority-only DFL behavior, manual refresh and focus preservation.
- Isolated real-renderer browser review at 320, 390 and 768 px: priority and FAAB modes, partial-history labels, drop watchlist, independent expanded details, refresh/retry focus, 200% text in dark/light themes and no horizontal overflow. Screenshots are uploaded by the existing workspace review CI job.
