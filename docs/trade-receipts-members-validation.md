# Trade receipts and generated member controls — 1.286.0

The generated Trade Board now has Add member, distinct member selectors and removal controls. Adding a member turns a single-partner search into a circular multi-team exchange, using the same send-to-next-team order as the manual desk. The route and every outgoing package are visible on the generated card, alongside each team's lineup and depth change. Analyze loads all parties and packages, preserving the existing evaluator and share ticket.

Generation searches a bounded beam of 240 package combinations and evaluates with evaluateMultiTeamTrade. It checks ownership, required outgoing/return anchors, explicit package counts, the eight-player total limit, and usefulness and roster impact for every party. No possible offer is guaranteed. Existing bilateral generation and league-wide shopping remain available. Multi-party suggestions are not written into the bilateral recommendation audit table; this avoids attributing a circular exchange to a two-party record.

Saved receipts use team identities, Sleeper player portraits with initials as a fallback, separate value labels, a compact balance badge and roomier responsive sections. Metrics remain the saved historical snapshot. Unrated receipts do not display fabricated zero lineup changes.

Validation: 1,029 tests across 115 files; TypeScript, name checks and production build. Browser verification of generated three-team deals, loading every party/player, member removal, receipt presentation, and WCAG A/AA checks at 320, 390 and 1280 pixels, with no horizontal overflow or JavaScript errors. Browser production writes were blocked; fixture receipt data was inserted locally.
