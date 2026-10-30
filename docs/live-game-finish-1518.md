# Live NFL viewing finish — 1.518.0

Clubhouse’s live-game feed and fantasy overview now have a shared, compact sports
presentation. The same changes apply inside the replay game browser.

- The game picker has an accessible name and a 44px refresh icon. Its selected
  game uses the observed summary status, so a lagging scoreboard’s quarter does
  not contradict the loaded game. Existing view selection keeps its underline.
- The NFL scoreboard uses real team marks, clear code/score pairs and the
  official game status. It retains zero versus unknown scores. Normal status
  announcements remain available to assistive technology without adding another
  repeated line; loading, offline and error feedback stay visible.
- Play-by-play uses a clock gutter and a light timeline. Touchdowns, big plays
  and scores have distinct labels and emphasis. The whole headline opens the
  original description, replacing a repeated Play details line on every row.
  Exact-clip actions remain separate 44px controls.
- Nullified/reversed plays retain their original description and a neutral
  No play label. They do not show a touchdown result, scoring snapshot or clip,
  and do not enter the Scoring/Big plays filters.
- Fantasy stats keep two equal away/home columns. Team headers explicitly mark
  their score as NFL; players retain the exact League/PPR points, names, owner,
  position and official stat line. Your roster has a subtle shared-theme accent.
  Unknown points remain a dash; actual zero and negative values remain exact.
- Larger text wraps names, scores and labels within each column. Controls,
  readable type, focus states and motion preferences retain their meaning.
- Refresh cadence, saved reading positions, open descriptions, player routes,
  pinned games, exact clips and native video lifetime retain their controllers.
  There is no new data request, polling loop or runtime dependency. Existing
  NFL logo URLs are reused; the added logo images are test fixtures only.

## Verification

- `pnpm check`: 2,404 tests / 291 files, release/themes/types/names/build.
  Final focused NFL/model/data tests pass (33 tests / four files), with final
  theme/type/name checks and build. App: 90 modules, three startup/four Home;
  shared CSS remains 57 sheets in one request.
- 112 focused live-game browser checks in Light/Dark at 320/390/768px: text
  contrast, touch targets, observed status, separate NFL versus fantasy scores,
  keyboard details, full descriptions, both stat columns, 200% text, unknown/
  zero/negative points, nullified plays/filters and Reduced Motion.
- Existing live refresh review: 62 checks, including next-play polling, reading
  anchors, Latest counts, open details, game/mode return, offline/error recovery,
  modal covering, final-game cadence and timer/listener cleanup.
- Existing full Clubhouse/replay review: 248 checks, including player-card
  routes, clips and filters, two-column statistics, 200% text, video retention,
  exact return and production-write blocking.
- Real built app verified read-only in Light/Dark for NFL game 401873023: the
  observed feed had 117 plays and 19 player stat rows. Both modes fit with
  readable contrast and no browser errors. Live counts can change with play.
  Mutation requests are blocked; the selected member is local to the test.
- Physical phone frame timing and screen-reader speech remain unmeasured.

See [live-game-finish-1518/](live-game-finish-1518/) for screenshots and check results.
