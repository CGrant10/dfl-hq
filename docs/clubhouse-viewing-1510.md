# Clubhouse game and replay journeys — 1.510.0

An NFL play's video now opens over its game rather than switching the underlying
Clubhouse tab to Highlights. The replay has a clear Back action; closing restores
the exact play and focus. Game selection and view changes retain their own reading
positions, and the NFL controls stay together above the feed.

## Viewing and continuity

- Pinned game cards use a compact native horizontal rail on phones. Team scores,
  relevant league players and the last play remain readable. The redundant Sunday
  label is removed; the desk works throughout the football week.
- Play-by-play and Fantasy stats use the shared underline rhythm with finite
  240ms movement. View content has a quiet 160ms transition. Reduced motion and
  Motion off keep controls immediate; vertical scrolling stays native.
- Reading state belongs to the game, view and play filter. Returning restores the
  visible row, its offset and expanded play descriptions. Viewed game summaries
  stay visible during a fresh request, avoiding a loading flash. These temporary
  references are limited to the viewed NFL week and cleared on teardown.
- Video and player sheets pause the NFL controller underneath. It resumes the
  same game when the covering dialog closes or is removed. An embedded NFL panel
  can still refresh inside its own replay dialog. Stale game responses cannot
  replace the user's new selection.
- The replay's game selector updates the clip browser too. Switching between
  clips, plays and fantasy keeps the same native video mounted. Opening a player
  card from replay stats pauses that video without replacing it.
- NFL player-card controls carry the viewed season and week. They do not use
  current-week defaults for an archived game, or substitute PPR points for the
  league's scoring. Generic player-card controls keep their original contract.
- Pinned games and the main view share confirmed summary scores and phase. A
  matching final summary advances a lagging board; a live snapshot cannot regress
  a finished game. Wrong-season/game summaries and malformed scores are ignored;
  a reported zero remains zero.
- Healthy refreshes do not change the Refresh button's width or announce clock
  seconds repeatedly. Loading, unavailable data, offline and failed-refresh states
  retain clear wording and the last usable content where available.

## Validation

- `pnpm check`: 2,382 tests / 290 files, release versions, themes, typecheck,
  unresolved identifiers and production build. Final type/name checks also pass.
  Bundle remains 90 modules, three startup / four Home. 56 shared styles ship in
  one request; no new backend endpoint or animation loop was added.
- 248 Clubhouse browser checks at 320/390px in Light/Dark, including contrast,
  native touch scrolling, source-week player cards, exact replay return, view
  restoration, notification links, 200% text and video ownership.
- 233 Home/replay checks cover clipping/filtering, native media identity, dynamic
  layouts, resizing, search, motion preferences, errors, Thursday expiry and late
  responses. Existing highlight retention is unchanged.
- 62 live NFL checks cover automatic updates, older-play anchors, independent
  fantasy reading positions, game round trips, pending cached views, late game
  responses, modal pause/resume, offline recovery and teardown.
- 116 connected-viewing checks cover dock/expand without forced autoplay or media
  replacement, navigation, reduced motion, personal recaps and existing trade
  handoffs. The clock fixture is pinned inside the highlight availability window
  so it remains deterministic after Thursday morning.
- Read-only checks with real league/provider data pass in both themes for an
  archived NFL game, its player card, exact focus/scroll return and game/view round
  trips. Video tests use isolated metadata and a local fixture clip. No production
  member, trade, wager, profile or notification was created.

Physical phone frame timing and screen-reader announcements were not measured.

## Inspected screenshots

- [320px Light stats](clubhouse-viewing-1510/320-light-nfl-fantasy.png) · [Dark](clubhouse-viewing-1510/320-dark-nfl-fantasy.png)
- [390px Light stats](clubhouse-viewing-1510/390-light-nfl-fantasy.png) · [Dark](clubhouse-viewing-1510/390-dark-nfl-fantasy.png)
- [Big plays](clubhouse-viewing-1510/390-light-nfl-big-plays.png) · [Replay game view](clubhouse-viewing-1510/390-dark-replay-game-center.png)
- [200% NFL text](clubhouse-viewing-1510/320-light-nfl-large-text.png) · [200% replay text](clubhouse-viewing-1510/320-dark-replay-large-text.png)
