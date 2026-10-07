# Trade workspace — v1.329.0

The Trade page keeps the existing DFL palette, hero artwork and ticket style. Find offers opens its current offer tier immediately; optional anchors and package settings fold away. Check a trade opens a compact manual builder with full player names, portraits, searchable roster disclosures and 44px controls.

Multi-member deals use stable per-player recipient IDs. One owner can split a package between several members. Each member must send and receive a player; self-routes, duplicate players, wrong ownership and missing destinations cannot produce a verdict. Adding members preserves existing choices. Removing a chosen recipient from a deal with several remaining recipients requires another choice. Bilateral deals have one possible recipient. Shared images and text describe actual transfer legs; a split package does not inflate the team count.

Every valid deal has an optimized before/after offensive lineup, bench and required cuts, using the same roster trimming and projection engine as its verdict. Package value explains recipient roster fit; weekly changes are labeled season averages. One DFLyzer headline stays visible with its full reasoning expandable. The balance label stays inside the ticket at the extremes.

Counteroffers evaluate at most 200 small edits, retain the main player from every package and any selected anchors, respect the eight-player cap, reject harmful roster outcomes and require a model improvement. They do not send offers. Up to three saved proposals can be compared and restored on the same device, scoped to profile and season. Current data regrades each saved deal; changed ownership prevents restoring an outdated package. Blocked or corrupt storage has a clear fallback.

Validation:

- `pnpm check`: TypeScript, unresolved-name check, 127 Vitest files / 1,151 tests, production build.
- `tools/render-trade-review.mjs` + `tools/capture-trade-review.py`: actual production page/event handlers with isolated sample data at 320, 390 and 768px. Pointer interactions verify split routes, sharing input, three-proposal limit, reload persistence, lineup/bench disclosures, applying a real counteroffer, removing recipients, stale ownership and removal, keeping chosen offer anchors when adding a member, and opening a linked target from a remembered manual draft. No horizontal overflow or page errors. This is a desktop browser at responsive widths, not physical-phone or assistive-technology testing.
- Premerge browser using the public app and real league read data, with local changed assets substituted: actual three-member split transfers, saved proposal, all 21 lineup slots, full names at 14px, real loaded player portraits, shared 44px top bar and no horizontal overflow or page errors. League mutations were blocked; only local proposals and selections were exercised.

A dedicated Trade workspace review CI job records screenshots and JSON evidence. Existing Home review continues separately. No database/schema changes, league offers or Sleeper lineup changes are part of this release.
