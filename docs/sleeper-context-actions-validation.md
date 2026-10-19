# Contextual Sleeper actions — 1.444.0

DFL now links to the relevant Sleeper tab from the tools where managers need to act:

- Home Start/Sit and owned-team Analyzer advice: Set lineup in Sleeper, opening the roster tab. The Analyzer action is withheld when viewing another manager's team.
- Home lineup warnings: the roster action sits beside the injury/empty-slot advice.
- GameDay watch: a Sleeper action in the persistent header opens the league's matchups tab without adding a row to the scoring toolbar.
- Clubhouse archive context: matchups and standings actions use that selected season's league ID.
- Trade Board, manual trade and Deal Room headers: open Sleeper's trades tab. The existing agreed-offer Open Sleeper action retains its original league destination.
- Waiver advice: separate player-market and roster actions. Watched free agents open the player-market tab; owned players retain the existing internal Explore trade action.

The shared `sleeper-links.js` helper accepts only known destinations and numeric league IDs, preserves long IDs as strings, and hides actions when the league is unavailable. Unsafe numeric IDs and unsupported destinations are rejected. Links use HTTPS, `_blank`, and `noopener noreferrer`, retaining the browser fallback and keeping the DFL view open. No new data requests, polling, permissions, or API writes are added. Existing page focus/visibility refresh behavior remains in place.

## Route evidence and limits

Verified the current published Sleeper web router for `/leagues/:league/team`, `/matchup`, `/players`, `/trades`, and `/standings`, alongside its league root. Sleeper's [public API documentation](https://docs.sleeper.com/) explicitly describes the API as read-only. These are navigation handoffs: they do not prefill, submit or execute a trade, claim or lineup change. We do not append undocumented player, matchup or week query parameters. Browser checks intercept external navigation rather than signing into Sleeper or changing league data.

Native iOS/Android app launch depends on device/browser link handling and was not verified on physical hardware. The implementation uses the same HTTPS opening pattern as the existing Deal Room action that the user reported working.

## Verification

- `pnpm check`: 1,934 tests in 234 files, release consistency, theme scan, TypeScript, unresolved-name scan and build passed. Focused handoff/advice/model suite: 22 tests passed.
- Build retains 78 modules, three startup modules and four Home modules. Previous 1.443.0 bundles remain unchanged.
- Dedicated browser review: 24 scenarios (four actual renderer sections × 320/390/768px × Light/Dark) verify destination URLs, safe new-window navigation, preserved DFL route, 44px touch targets, screen-edge padding, and no horizontal page overflow. Actual settled screenshots reviewed. Narrow Trade tabs retain a single horizontally scrollable row.
- Existing Trade regression passed at 320/390/768px, including sharing, fresh injury and ownership checks, multi-team routing, receipt themes and enlarged text.
- Existing waiver browser checks passed at 320/390/768px, including advice refresh, failure recovery, FAAB/priority states and enlarged type in both themes.
- Home week flow passed 12 pregame/live/final mobile states in Light/Dark, with focus, scroll stability, preferences and cleanup checks.
- Existing finish/Watch/Clubhouse browser checks passed in both mobile palettes, including motion off, archive results and share-card behavior.
- The full hosted Home sweep also checks the actual Watch controller with a valid fixture league ID and asserts the matchups handoff; fixtures import the shared helper used by production.

QA uses isolated sample rosters and intercepted external destinations. No real offers, lineup changes or waiver claims were created. Physical-device app switching, keyboard behavior and screen-reader speech remain unverified.
