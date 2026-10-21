# Mobile continuity and power rankings · 1.454.0

Power rankings keeps the top three and the selected manager's team in a compact
list. Consistent smaller portraits, aligned score/movement columns, full team
names and one record/trend line replace the separate biggest-climber banner and
Top Dog label. Ranking scores, weights and published editions are unchanged.

View all expands the actual rows using intrinsic CSS grid tracks over 320ms.
The same transition reverses during a second tap, adapts to wrapping/zoom without
stored pixel heights and moves the selected team naturally into its ranked
position. Collapsed rows are immediately inert and hidden from assistive
technology; visibility clears after the exit. Motion off and reduced motion
settle immediately. Week changes preserve expanded state, cancel old row effects
and retain keyboard focus. A four-row loading layout reserves space on Home;
failed loading resolves to the unavailable state.

Ranking details use the existing player-card sheet entrance, exit and header
drag controller. Short/cancelled pulls return; long pulls dismiss and restore
focus. Escape, repeated dismissal and page cleanup share the existing guarded
exit. Themes use shared Medicine Wheel tokens; team photos retain the current
Sleeper → owner → DFL profile → initials fallback.

The shared player card retains one recently checked model for up to 60 seconds
in memory. Reopening the same player/member/context keeps content visible while
the existing loaders refresh it. Actions remain inert until completion. An
unchanged response retains DOM and content scroll; changed data preserves the
scroll offset. Failure keeps the checked stats, a recovery message and Retry;
actions remain held. Other members, players, seasons, weeks and expired previews
use the initial placeholder. Dismissed/obsolete requests cannot repaint the
card. The existing Trade draft persistence, refresh anchoring and submission
rechecks remain in use. No new polling or startup data requests are added.

Player cards also offer Open Sleeper through the verified league URL helper.
Owned players open the league roster section; free agents open its player pool.
The link is omitted when the latest league does not match the card's season.
This does not submit a lineup, waiver or trade.

Home's daily opening saying remains independent of the selected manager. One
additional dated league spotlight uses an already-built completed-week report:
the closest win within five points, a biggest win of at least 30 points, or a
scoring spotlight. It skips the viewer's matchup. League superlatives are only
used for the actual league-wide extreme, including when that game is skipped.
Ties, incomplete/malformed results, other seasons and reports older than the
current/previous model week are withheld. A large margin/point figure, brief
headline and both actual scores use the existing stat treatment and link to the
exact Clubhouse week. No invented player events or additional data feed. The
Wall stays last.

## Verification

- `pnpm check`: 240 files / 1,991 tests passed, theme/name/type/release checks
  passed and production build passed. Startup remains three modules; Home four.
- Power browser checks: 320/390/768px in Light/Dark, full long names, 44px targets,
  images/fallbacks, focus, Escape, 200% text, week boundaries, expanded week
  navigation, intermediate expand/collapse heights, in-flight reversal, resize
  and week-switch interruption, touch sheet dismissal, Motion off/reduced
  motion, once-per-edition reveal and cleanup. Zero browser errors.
- Shared sheet suite: 75 browser checks passed, including existing player/slip
  gestures and keyboard viewport tests plus retained content, unchanged refresh
  identity/scroll, failed refresh/retry, member isolation and Sleeper action.
- League spotlight: six phone/tablet Light/Dark captures checked actual score,
  no document/slide overflow and the exact dated destination. Model tests cover
  personal-matchup exclusion, truthful superlatives and withheld results.
- The full Home browser workflow exercises broadcast composition, swipes, tabs,
  player portrait motion, delayed revalidation, focus, themes and navigation.

Accepted fixture screenshots and structured checks are in
[mobile-power-polish](./mobile-power-polish/). Fixture pictures and results are
isolated examples, with backend writes disabled. Physical iOS/Android frame
pacing, native app handoff and comprehensive screen-reader speech remain
unverified. The retained preview does not make live data available offline.

Release 1.454.0 retains the 1.453.0 bundle unchanged. No schema or notification
preference changes are required.
