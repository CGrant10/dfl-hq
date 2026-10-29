# Connected viewing, trade routing and motion — 1.514.0

A fantasy matchup now stays visible while opening its player cards and clips.
The trade builder gains a compact receiving board for multi-team deals. Home
puts roster decisions first before kickoff, while shared scrolling and sheet
transitions use quieter handoffs and respond to interrupted movement.

## Connected matchup viewing

- The selected matchup's two actual fantasy scores and complete team names stay
  in the player/replay header. This context is a snapshot from the opening
  matchup, distinct from the NFL game's video score. Unknown fantasy totals do
  not become zero, and the strip does not claim to be a continuously live feed.
- Player cards opened from that replay inherit the same matchup. Unrelated
  openings clear the prior context. Existing source-week stats, exact clip
  matching, focus/scroll return and selected momentum moment remain intact.
- Minimize/expand retains the native video. After leaving the original page,
  the independent expanded viewer retains the originating fantasy matchup.
  Changing clips releases the old media source; no second video keeps playing.
- Selected lead changes, confirmed touchdowns/big plays and recorded player
  scoring moments gain a short DFL roast. Wording is stable per event, varied
  between event keys and grounded in the receipt. Ordinary score checkpoints
  stay quiet. No projected wins, inferred touchdown fantasy points, attributed
  member quotes, posts or notifications are generated.

## Trade destinations

- Multi-team editing shows **Where they land**: compact receiving-team lanes with
  full player names, original owners and current destinations. Unassigned players
  remain separate; no destination or grade is fabricated. Two-team editing keeps
  its existing compact controls instead of adding a redundant board.
- Drag the explicit handle to a receiving team, or choose a chip and use **Send
  here** with touch or keyboard. Player ownership never changes. Every action
  uses the same validated destination mutation and existing valuation engine.
  Rerouting updates the grade, selected-player controls and shareable deal.
- Moving a player cannot silently make an incomplete trade valid. Existing
  send/receive requirements, stable IDs, ownership, package limits and valuation
  safeguards remain. Undo restores exact prior routes and packages.
- Pointer previews are inert and transparent to input; geometry is read at drag
  start, movement uses one scheduled frame, and normal chip/name scrolling stays
  native. Cancellation, extra fingers, scroll, resize and teardown remove the
  preview without committing a trade. No server mutation is made by routing.

## Home and motion

- Once the actual next kickoff is within 48 hours, preparation takes priority
  over the last completed week's aftermath. This normally puts Wednesday's
  roster decisions first. During live games, the matchup and clips lead; after
  final results, the matchup result and weekly receipts lead. NFL schedule/status
  drives the choice rather than guessing from the weekday.
- Home resolves the order once on entry. Existing pointer, keyboard, focus and
  scroll guards prevent late data or a phase change from reshuffling an engaged
  visit. The daily broadcast opener stays independent and Wall remains last.
- Scoreboard source/flight/dock copies ease through wider handoff ranges using
  the same sampled path in native scroll timelines and the cached fallback.
  Position follows the actual scroll value directly, including fast reversals.
  Source/destination layouts and complete team names retain their space.
- Section headings enter once over 260ms and 4px, skip fast flicks and settle
  immediately when scrolling reverses. Sticky context bars travel only 4px and
  reverse from their displayed frame; label motion is shorter and quieter.
  No inertial delay is added to the document itself.
- Returning player portraits use the shared ease while the sheet fades in place,
  removing its extra downward drift. Existing photo-first opening, source focus,
  source-week stats, reduced motion, Motion off and native sheet drags remain.
- Narrow result broadcasts now align full team names and scores in two rows.
  Metric categories wrap inside their copy column. Long names no longer push
  these facts under the controls at 320px.

## Verification

- `pnpm check`: 2,403 tests in 291 files, release consistency, themes, typecheck,
  names and build. Final relevant unit/type/name/theme/build checks pass too.
- 153 new browser checks in Light/Dark at 320/390/768px: exact score context,
  nested and detached viewing, media release/ownership, focus return, native touch
  routing, keyboard/tap routes, cancelled gestures, Undo, incomplete deals,
  200% text, contrast and phase-based Home priorities.
- Existing regression checks pass: 141 momentum, 248 Clubhouse, 116 connected
  viewing/trade actions, 84 trade editing, 43 player-card finish and 72 shared
  scroll checks. The scoreboard's native/fallback review covers 18 cases; Home
  entry covers 18 cases plus three late-data guards. Eight broadcast contrast,
  transport and enlarged-text cases pass after the narrow-layout corrections.
- Actual league data was checked read-only in both themes: 2026 week 7,
  matchup 6, recorded chart scores 7/10 and final fantasy context 151.80/93.02.
  Opening and returning from the real player's card preserves focus and the
  exact selected momentum entry. Historical clips retain existing Thursday
  expiry; media checks use isolated local video, not expired league footage.
- The previously failing connected-viewing CI fixture now renders the trade
  harness explicitly. Its output path resolves relative to the checkout on both
  local and hosted runners. The Clubhouse native-swipe fixture crosses the snap
  card's midpoint rather than depending on momentum from a short gesture.
- Production remains 90 modules, three startup/four Home, and 57 shared styles in
  one request. No new dependency, database schema, worker or idle animation loop.
  Production member, wager, trade, profile and notification data were not edited.
- Physical-device frame pacing, decoder behavior and screen-reader speech remain
  unmeasured. Native media controls remain available if autoplay is refused.

## Inspected screenshots

- [Actual Light player context](connected-motion-1514/light-real-player.png) · [Dark](connected-motion-1514/dark-real-player.png)
- [Replay](connected-motion-1514/light-replay.png) · [Dark replay](connected-motion-1514/dark-replay.png)
- [320px receiving board](connected-motion-1514/light-routing.png) · [Dark board](connected-motion-1514/dark-routing.png)
- [Large routing text](connected-motion-1514/dark-routing-large.png) · [Large player context](connected-motion-1514/dark-player-large.png)
- [320px result](connected-motion-1514/light-result.png) · [Dark result](connected-motion-1514/dark-result.png)
- [Recorded-play roast](connected-motion-1514/dark-play-roast.png)
