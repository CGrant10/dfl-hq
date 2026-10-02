# Clubhouse release validation

Wall placement: last activity section on Home, after the League Feed. Sportsbook stays in the main navigation.

## Implemented

- Wall threads support text replies, a member picker for unambiguous @mentions, targeted in-app alerts, reply counts, loading/retry states, pagination and owner/commissioner deletion. Selecting an alert or search result opens its exact post, including older posts outside the latest feed.
- Wall alerts are in-app only. They do not send lock-screen push. Existing push settings and authentication for other targeted notifications are preserved. Public Wall text can appear in the selected member's inbox without enrolling a push device.
- Sportsbook saves product, subtab, prop filters, favorites-only view, expanded games and scroll separately per member on that browser. Wagers and stakes are excluded. Missing filter options reset when markets change. Both tab strips support arrows/Home/End and one tab stop.
- Header search and Ctrl/Cmd K search public members, manual league records/history, old Wall posts and Sleeper players. Record/post results open their exact entry; players open matching Sportsbook props. Results are bounded, escaped and grouped. No private finances, push subscription data or PINs enter search.
- Search uses a native modal with a label, status announcements, keyboard focus containment, Escape/Close and focus return. Reply fields and mention selectors have explicit labels. New primary controls provide 44px touch targets.
- Installation shortcuts open Sportsbook, the Wall and the Trade Desk. The release includes the new modules in the app-shell cache.

## Automated and emulated checks

Database tests run in a rolled-back transaction: reply ownership, rejection of anonymous inserts, mention deduplication, exclusion of unmentioned recipients, author alerts, read state and public search. No test messages or posts remain in the league.

Browser validation uses Chromium with production reads and blocked production writes. Reply submission/failure/deletion tests use browser-only fixtures. Checks cover phone widths, desktop, keyboard, enlarged text, reduced motion, saved Sportsbook state, member isolation, deep links, installation metadata, service-worker activation and previously visited offline routes. Axe checks WCAG 2 A/AA, 2.1 A/AA and 2.2 AA. Passing these checks does not establish complete WCAG conformance.

## Physical-phone checks still required

1. iPhone: install with Share → Add to Home Screen; open the icon and navigate all six main tabs. With VoiceOver, search, open a result, expand a thread, choose a mention and submit a reply. Confirm reading order, announcements, keyboard dismissal, safe-area spacing and focus after closing search.
2. Android: install from Chrome and repeat with TalkBack, enlarged system text and magnification. Check filters and text entry with the phone keyboard open.
3. On each installed phone, enable existing device notifications and use the app's **Send a test** control while DFL is in the background. Verify lock-screen delivery and tapping the alert. Test only your own device. Wall notices currently arrive in the app's inbox.
4. Open Home and Sportsbook, close/reopen the installed app, briefly disconnect, then reconnect. Confirm cached-page recovery and saved Sportsbook preferences. Live league data, posting and betting require a connection.

Physical VoiceOver/TalkBack and background push delivery cannot be verified in this cloud workspace.

## Release evidence (2026-10-02)

`pnpm check`: 949 tests across 100 files, type checking, identifier checks and production build. Browser fixtures verify failed-reply draft retention, mention insertion, reply creation/deletion, thread deep links, modal focus, Escape, arrow-key tabs, filters, scroll and reload persistence. Database changes were applied to the DFL HQ project and verified with rollback-only writes.

The offline browser test blocks the network and supplies the offline navigator signal: Playwright’s service-worker environment otherwise continues to report `navigator.onLine=true`. The app also bounds startup connection waits to ten seconds for networks that remain connected without reaching the server.
