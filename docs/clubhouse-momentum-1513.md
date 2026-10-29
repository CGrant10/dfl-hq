# Clubhouse matchup momentum — 1.513.0

Clubhouse Matchups now puts recorded score momentum before the team statistics.
Two score traces, full team names and the chosen member photos share a compact
mobile surface. A native scrubber selects exact recorded scores, lead changes or
player moments. All, Lead changes and Plays narrow the same view.

## Data and viewing behavior

- Score traces use actual timestamped two-team observations. No kickoff points,
  interpolated scoring events, touchdown fantasy points or historical scoring
  samples are invented. Downward stat corrections remain visible. Older games
  contain only available saved records; full traces accumulate from new syncs.
- Existing automatic GameDay capture now records score changes through a database
  trigger. Unchanged scores, metadata-only changes, incomplete matchups and unknown
  scores do not add checkpoints. No separate worker or browser polling loop was
  introduced. The new indexed table is readable by the public league app, with
  browser inserts/updates denied. Existing notifications are unchanged.
- The migration backfilled 49 verified lead receipts, retaining their recorded
  scores and timestamps. Applied migration: 20261029162624_gameday_score_history.
  Production RLS, read-only client grants and trigger presence were checked.
  Security advisors reported no findings for the new table or capture function;
  existing unrelated project findings were not changed by this release.
- Confirmed player plays open the exact available clip in the existing replay
  studio or its NFL play-by-play source. Player cards receive the selected season
  and week. Existing recap and sharing remain available.
- Native scrubbing updates only the selection and detail, without rebuilding the
  plot or requesting data. Incoming refreshes preserve the drag's original event
  domain until release. Selected moments stay selected while reading; Latest
  explicitly resumes following new observations.
- Switching matchups preserves each one's selection/filter during the mounted
  visit. Back restores the history entry's UI choices, while fresh navigation
  starts at Latest. Clip/player openings freeze the selected moment. Late clip
  responses cannot open over another matchup or modal, and covered views defer
  painting until the viewer returns. Cleanup removes listeners and observers.
- Score sides use solid/dashed traces as well as different theme inks. Intrinsic
  grids reflow at enlarged text sizes. Controls retain 44px targets; native range
  keyboard behavior, descriptive values and committed announcements remain.
  Reduced motion and Motion off skip selection transitions.

## Validation

- `pnpm check`: 2,394 tests in 290 files, release consistency, themes, typecheck,
  names and production build. Final focused model/recap/network run: 24 tests.
  Final theme/type/name/build checks also pass.
- 141 momentum browser checks at 320/390/768px in Light/Dark cover native touch
  and keyboard, live updates while dragging, exact replay/player destinations,
  replay return, stale responses, game switching, failures/retry, Back versus
  fresh visits, 200% text, motion preferences and teardown. No browser errors.
- Existing 97 highlight/recap and 248 Clubhouse viewing checks pass.
- Isolated PostgreSQL tests cover changed/unchanged scores, corrections, partial
  and unknown matchups, existing lead-notification behavior, browser read-only
  access and reapplying the migration without duplicate checkpoints.
- The built app was checked read-only against real league data in both themes:
  2026 week 7, matchup 6, recorded scores 7 and 10, history loads and exact
  matchup-selection round trips. Fixtures block production writes and use an
  isolated clip for replay checks; expired historical clips are not extended.
- Production remains 90 modules, three startup/four Home. Shared styles ship in
  one request (57 sheets). No new runtime dependency or idle animation loop.
- Physical-phone frame timing and screen-reader announcements were not measured.

## Inspected screenshots

- [Light momentum](clubhouse-momentum-1513/light-390-momentum.png) · [Dark](clubhouse-momentum-1513/dark-390-momentum.png)
- [Confirmed play at 320px](clubhouse-momentum-1513/light-320-play.png) · [Dark play](clubhouse-momentum-1513/dark-320-play.png)
- [200% text](clubhouse-momentum-1513/light-320-large-text.png) · [Dark enlarged text](clubhouse-momentum-1513/dark-320-large-text.png)
- [Actual league scores](clubhouse-momentum-1513/light-recorded-scores.png) · [Dark real data](clubhouse-momentum-1513/dark-recorded-scores.png)
- [141 browser checks](clubhouse-momentum-1513/checks.json)
