# Mobile bug and performance audit — 1.420.0

The audit covered Home, Clubhouse, Sportsbook, Trade Board, Team Analyzer, More, History, the Wall, Rules, alert-to-receipt navigation and return visits. The live browsing pass used a 390 × 844 touch viewport and the existing selected league profile. No bet, daily claim, trade, vote or wall post was submitted.

## Findings and changes

- **Home broadcast waited for unrelated work.** Its loading state stayed up until the player model, weekly projections, previous-week analysis, trade records and injury feed all settled. Render the already available league stories immediately, then update the same carousel controller when the weekly model finishes. The delayed-model check confirmed an available broadcast, retained controller and preserved pause state.
- **Speculative page imports competed with Home.** An idle callback can run while the page is waiting on network data. Trade/Clubhouse modules began downloading before Home's work finished. Warm them only after the mounted route and Home report are ready, retaining touch/hover prefetch. Downloads remain sequential, respect constrained connections and stop on page exit.
- **Invisible sizing cards fetched full artwork.** The broadcast measured every slide using connected image markup. That requested champion/Chip Eater art before those slides appeared. Measure inert template content without image sources; visible slides keep their original artwork. Browser checks now reject hidden artwork requests and continue to check layout, controls and image framing.
- **Sportsbook recovery was fragile.** A deliberately empty wallet response reached a null-property error. Validate the wallet response and show one Retry control using the shared route-recovery path. Fault injection and recovery checks passed. The normal live Sportsbook loaded correctly; this was a recovery defect rather than evidence of a current wallet outage.
- **Broadcast cleanup.** Decorative league logos and separate splatter are removed after the opener. The opener, champion, Chip Eater and story-specific player artwork remain.

## Performance evidence

Two uncached baseline sessions rendered the Home shell in approximately 12.4 and 21.7 seconds, with the full broadcast appearing around 17.8 and 27.4 seconds. One trace recorded 341 browser requests and about 8.7 MB of response bodies during startup. Returning primary routes generally rendered in roughly 0.5–2.7 seconds in these sessions.

These are controlled workspace measurements through its network proxy, with service workers and HTTP cache disabled by request interception. They are not physical-phone or installed-PWA benchmarks. Network/cache variation was substantial; changes are supported by request ordering and fault/delay checks rather than a promised speed multiplier.

The corrected live pass had no uncaught JavaScript errors, failed read requests or horizontal document overflow. An initial audit guard blocked wallet initialization and watchlist reads; that false-positive pass was excluded from the functional conclusions.

## Remaining priorities

1. Bundle the app's JavaScript into a small initial entry and route chunks. The cold module waterfall remains the largest startup opportunity; this release deliberately does not replace the build/offline-update pipeline.
2. Reduce late content expansion. The controlled delayed-model check settled the broadcast from 344 to 373 pixels as complete stories arrived. Rotation remains stable afterward, but initial loading geometry can improve further.
3. Profile real phones and first-install/update caching. Heavy player-model work and the service worker's installation downloads need measurement with the normal PWA cache enabled.

## Scope and limits

The accepted screenshots and full per-step timing/network evidence are in the session audit artifact. Functional findings cover browsing, navigation and local loading/recovery behavior. They do not certify trade-value accuracy, live-game scoring, race concurrency, financial settlement, assistive-technology compliance or write operations. More was opaque in its captured opening/settled frames, and the known alert opened the correct three-team receipt.
