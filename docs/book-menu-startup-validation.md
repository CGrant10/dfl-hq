# Sportsbook, More and startup — 1.412.0

Every fantasy matchup now appears in one regular weekly grid. The member's matchup keeps its place in that grid and receives a visible “Your matchup” label and accent border, including locked matchups. Current team-name mapping, original markets/outcomes, prices, tickets and share cards are preserved. Team names wrap and prices use a narrower column.

More previously opened immediately over a 60% opaque backdrop, exposing Home above and through its card. It now uses an opaque full-height navigation surface. Only the card moves; the cover stays opaque through dismissal and rapid reopen. The covered page is hidden without changing its layout or scroll position. Focus return, Escape, route navigation, scroll reset and motion preferences remain supported. The shared exit helper gains an opt-out of fading, with its existing default preserved for other sheets.

Startup work is overlapped rather than bypassed. After the shell's existing worker/version guard resolves, only the requested Home/Clubhouse/Sportsbook/Trade page is module-preloaded. App boot also shares its pending route import while identity/settings restore. Rendering still waits for restoration and the existing member-lock check. Returning profiles overlap live-team-name lookup with the member directory read; the complete directory, historical aliases, latest-name refresh, in-flight deduplication and fallback on feed failure remain intact. Notification counts, quick-sync status and trade coverage mount after the first route is ready.

The baseline cold production trace spent about 2.25 seconds loading Home's module after boot restoration. The final local trace showed the module ready when routing began, and resource timings confirmed page/name requests started before the member response completed. Host/network timing and test-machine load vary, so these traces establish the removed serial waits rather than a guaranteed device-wide speedup. Live data still depends on the connection.

Validation:

- Full `pnpm check` passed 1,709 tests in 201 files. A subsequent 27-test focused run covered the final module-preload guard, current-name/in-flight behavior, opaque exit lifecycle and inline/locked personal matchups.
- Guarded mobile browser checks cover six visible matchup cards, personal-matchup placement, valid/broken portraits and selected-state bounds, complete opaque More coverage on every animation frame, stable scroll/focus, repeated opens, mid-dismissal reopen, Escape and route navigation at 320/390/430px with Motion on/off and OS reduced motion.
- Startup traces record only resource paths, timings and sizes. Browser review blocks business writes. No league data, auth policy, accepted odds, notification preference or feed-sync behavior is changed.
- Shared browser CI, main checks and deployed asset parity must pass before completion.

Artifacts: `/workspace/dfl-nav-startup-1412/`.
