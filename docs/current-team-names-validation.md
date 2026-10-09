# Current team names — v1.340.0

All seasons display each linked owner's current Sleeper team name. Historical scores, owner IDs, grades, odds and payouts are preserved. The member directory shares in-flight reads, refreshes after one minute, and falls back to the newest synced name if the public feed fails.

Past names remain lookup aliases, not displayed team identities. Ambiguous aliases never select an owner. Old trades use saved user IDs or season/roster IDs. Historical matchup labels with missing user IDs use verified season/roster ownership; unrelated deleted owners retain their archived fallback.

Covered surfaces: Home, History yearbooks and facts, profile season tables and shares, weekly Clubhouse archives and recaps, player cards, keeper rows and boards, Chip Eater badges, Sportsbook market/outcome labels and saved ticket shares, Trades and Analyzer.

Validation used actual read-only league data and current Sleeper users: all 12 current names matched; 2019 yearbook and Week 1 archives displayed current labels; profile seasons used one current name. Screens at 320/390/768px had no horizontal overflow. Sportsbook writes were blocked during browser verification. Trade-handler fixture checks exercised offers, multiplayer destinations, saved proposals, counteroffers and shares.

Local full check passed 136 test files before the final alias and missing-user-ID regressions; targeted checks and TypeScript passed after those adjustments. Exact-head CI runs the complete final suite before merge.
