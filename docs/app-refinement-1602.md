# Everyday app refinement — 1.602.0

## Trade controls

Teams and player targets remain visible. One staged Trade options sheet owns
positions (both directions), protected players, package limits, send/get counts,
goal and planning horizon. Apply commits once; Cancel/Escape retains the current
search. Apply and dismiss use the existing sheet motion, with repeat submit
protection and focus restoration. Active criteria are removable chips with
single-line names. Trading-as, extra teams and routing remain available under
Teams & routing; the FantasyCalc database link remains inside Options.

Counts reconcile with required anchors and additional parties, and incompatible
counts/goals disable or reset safely. Protection stays scoped to the owned roster.
The search still opens across all teams, keeps up to eight players, and retains
the existing 1QB/PPR model, current ownership and handcuff safeguards. Delayed
schedule responses cannot override a later season-view choice or a search reset;
failed schedule loads show an actionable retry instead of silently switching.

## Refresh and Clubhouse

Roster advice reuses computation only for the same source snapshot, player-value
pool, roster and current role facts. Kickoff transitions invalidate that work
even inside the minute network cache. New snapshots, changed values/depth facts,
source staleness and explicit refresh recompute the plan. Source snapshot promise
failures cannot evict a newer request after cache reset. Weak-map storage follows
the source objects instead of retaining every prior visit.

Read-only current-league checks reuse the same plan in approximately 0.2–0.4ms.
This measures a repeated lookup, not cold app loading or network latency. Roster
9 still retains Emmett Johnson as Kenneth Walker's handcuff and has no unsafe
waiver recommendation on the checked snapshot.

Clubhouse keeps the existing scores-first, side-by-side matchup layout. Pregame
rows retain kickoff and PPR average without repeating 'Yet to play.' Live stat
lines remain. Featured player content and matchup chatter now reconcile existing
DOM instead of replacing player images and controls on every refresh. Identical
score text is left intact. Existing thermal effects, swipes, focused controls,
shared navigation and motion preferences remain.

## Broadcast

Automatic duplicate claims from different generators are removed after freshness
ranking, so an expired copy cannot suppress the fresh story. Dated automatic
final results retire after seven days; archive stories and deliberate commissioner
cards remain eligible. Football result cards add thin rails showing the actual
score proportions. Missing, negative, zero-total, projected and golf scores do not
get an invented football chart. Exact card destinations and the daily opener,
award illustrations, compact wide format and existing motion remain.

## Notifications

Verified live touchdown/big-play sends now use high transport urgency with their
existing short expiry. Ordinary news and routine matchup moments remain normal.
Opt-outs, per-member/play deduplication, recipient checks and bounded TTL are
unchanged. Notification taps reuse a window within DFL's scope, prefer a visible
DFL tab, await its exact destination and open a new DFL window if a tab closes or
client lookup fails. Another app on the same origin is never repurposed.

The production sender is deployed as `send-notification` version 17. Its served
source matches the tested bundle; cron authentication, existing custom-auth
boundary, pinned SDK versions, VAPID configuration and JWT setting are preserved.
Live GET/OPTIONS method/CORS smoke checks pass without sending a league alert.

## Verification

- All 2,709 tests across 323 files, plus source and bundled sender checks. The sender fixture
  executes the production handler using generated roster-play drafts and mocked
  database/push I/O: exact clip, missing-video fallback, opt-out, duplicate and
  expiry cases. Worker tests separately cover parsing, capture and saved moments;
  service-worker tests cover foreground refresh and exact tap destinations.
- Phone trade checks at 320/390px, Medicine Wheel Light/Dark, normal/enlarged text:
  staged apply/cancel, both-way positions, exclusions, roster search, active-chip
  removal, focus return, valid footer/body scrolling, contrast, delayed schedule
  cancellation and retry feedback. No horizontal overflow or page errors.
- Broadcast production markup: 96 standard and 60 enlarged layouts, all checked
  for content/art bounds, readable headlines and exact routes. One-pass rotation,
  manual replay and reduced motion pass. Actual screenshots were inspected.
- Current-league Home, Clubhouse and Trade reads in both themes block provider
  writes. Existing round-logo startup and selected-member context remain.
- Release, theme, type and identifier checks; 89-module build with unchanged
  startup (3) and Home (4) module budgets.

Evidence: `/workspace/dfl-polish-1602/`. These checks do not measure physical
phone push arrival, native-device animation pacing or screen-reader speech.

## 1.602.1 follow-up

Reset options also restores roster rows hidden by the staged search query. The
search input and displayed rows now reset together; Cancel still preserves the
applied search. Verified with the production dialog handlers at 320/390px in
Light/Dark, including enlarged text, combined with the existing staged-filter,
focus, schedule-race and retry checks. Nine focused model/cache tests and the
release/theme/type/name/build checks pass; the 1.602.0 foundation passed all
2,709 tests. No palette, notification backend or valuation change.
