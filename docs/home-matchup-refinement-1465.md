# Home matchup — 1.465.0

The compact header now uses the matchup's status instead of exposing the
internal “Actual” score label. Upcoming, Live, In progress and Final follow the
same personal-matchup status as the expanded card. Forecasts keep “Projected”.
A legacy host without a status shows the week alone. Status-only refreshes
update the heading without waiting for a score change.

Trimmed the masthead, team-to-score gap and result row. At 390px, the fixture's
matchup link falls from 190px to 160px tall and the broadcast starts 36px earlier.
Score and team-name font sizes are unchanged; names still wrap in full. The
compact bar loses 3px of vertical padding/gap. The original live-score feedback
lane stays intact; neither surface adds explanatory copy or duplicate stats.

## Verification

- `pnpm check`: 2,022 tests in 246 files, theme/name/type/release checks and
  production build passed. Theme check/build repeated after the final CSS edit.
- Production Home score review: 18 cases, no browser errors. Native and forced
  fallback paths at 320/390/430px in Light/Dark; forward/reverse handoffs, complete
  names, avatar separation, stable fonts, viewport-height changes, live data,
  modal recovery, motion-off, reduced motion and teardown.
- Both drivers pass the new status-only refresh, projected-score and legacy-host
  heading checks. The fixture restores its unanimated source before replacing
  markup; assertions wait for the compositor's actual progress rather than
  assuming a fixed 75ms render deadline.
- 120-frame reversing scrolls retain six prepared copies with no source geometry
  reads. Native motion performs no inline flight-style writes. Touch scrolling
  is also exercised with 4× CPU throttling.
- Existing isolated scroll review: 71 checks passed. Separate real score-feedback
  checks at 320/390/430/1280px in both themes retain 2–4px clearance above totals.

Screens inspected: [Light 320 expanded](home-matchup-refinement-1465/native-light-320-expanded.png),
[Dark 320 expanded](home-matchup-refinement-1465/native-dark-320-expanded.png),
[Light live dock](home-matchup-refinement-1465/live-light-390-dock.png),
[Dark live dock](home-matchup-refinement-1465/live-dark-390-dock.png),
[Dark mid-flight](home-matchup-refinement-1465/native-dark-390-flight.png).
The live screenshots use isolated synthetic scores; the score-motion review uses
loaded local photo stand-ins. No league data was changed.

Machine-readable [score checks](home-matchup-refinement-1465/score-checks.json) and
[feedback geometry](home-matchup-refinement-1465/score-feedback.json) are retained.
Physical iPhone/Safari frame pacing, low-power mode and high-refresh devices
remain unverified.
