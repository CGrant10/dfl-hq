# Trade offer counts — 1.387.0

Fair, Aggressive and Steal display the number of generated offers for the current teams, anchors, package limit and per-side counts. Each uses its own intent-specific search; fallback offers from another tier do not inflate the count. Counts cover the bounded generated results, not every theoretical player combination.

The selected tier finishes first. Other tiers run sequentially in the existing background worker. Pending counts show (…) and failed counts show (?) with an accessible retry label. Zero appears only after a completed search finds none. Completed tiers and four recent setups are cached. An unsearched selected tier interrupts background work; changed filters, leaving the page, entering manual mode and refreshed model data cancel stale work. Sharing revalidation also replaces the worker snapshot with the fresh roster/player data.

Validation: six catalog tests plus existing discovery/search tests passed. Actual page handlers and worker were checked at 320, 390 and 768px: baseline Fair 39 / Aggressive 34 / Steal 7; two-for-one 0 / 24 / 0; league-wide two-for-one 0 / 73 / 0. Each badge matched that intent’s returned results; cached tab switches sent no extra worker queries. No page errors or horizontal overflow. Automated Trade browser review includes completed counts, tier switches and a zero-Fair case.

## Yahoo market research

Yahoo describes its Trade Market as trades/trends in other leagues, with player and multi-player browsing. Official API documentation exposes completed trades through league-qualified transactions and requires OAuth. It does not document an aggregate Trade Market endpoint; no automatic market feed was integrated or added to the valuation model.

Sources checked October 12, 2026:
- https://help.yahoo.com/kb/fantasy-football/access-trading-list-trade-market-yahoo-fantasy-sln7004.html
- https://sports.yahoo.com/developer/docs/
- https://sports.yahoo.com/developer/
- https://football.fantasysports.yahoo.com/f1/playertrades?type=multi

The direct market and documentation fetches returned HTTP 429 in this research session; official indexed documentation/help established the available capabilities. An embedded cross-league feed and its latency, league-format coverage and package matching remain unverified. A link to Yahoo’s own Trade Market is the immediate reference option; approved provider access would be needed before promising a supported automatic integration.
