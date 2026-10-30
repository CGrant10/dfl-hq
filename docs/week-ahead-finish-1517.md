# Home Week ahead finish — 1.517.0

Opening the weekly desk now leads directly into the chosen view. A single
accessible heading and content-week label replace the stacked section/forecast
headings. On the 390px fixture, the first brief moves from 226px below the
section top to 107px, reclaiming 119px without reducing the main text.

- Briefing has a 20–24px lead and compact labeled rows for playoff position,
  lineup call and the current actionable next move. Existing warnings and
  freshness updates keep their original selectors and data.
- Predictions pair both full team names with their own totals. The first game
  has larger numbers; supporting games use smaller rows. Projected labels,
  exact margins, the personal matchup and all six games remain. Narrow screens
  stack the two team rows. Forecast values and ranking logic do not change.
- Top Players keeps the position strip, three ranks, original player actions,
  actual/projected status and full ownership/matchup detail. The lead gets a
  larger portrait and score. Identity and points wrap into separate rows when
  text needs space, rather than overlapping or shrinking names.
- Start / Sit emphasizes the available moves or one Hold heading. It retains
  all warnings, paired players, gains, comparisons, backups and Sleeper/Analyzer
  actions. No filled gray cards or duplicate Hold title are introduced.
- Main and position tabs keep their existing shared indicator, swipe and
  keyboard behavior. An overflowing rail scrolls its chosen tab into view using
  native horizontal movement; Motion off/Reduced Motion make that instant.
  Large text and Comfortable reading preferences remain supported.
- The week label follows the displayed forecast. Live/final priorities, saved
  disclosure preferences and deferred section reordering keep their existing
  controller and keys. Home’s broadcast, scoreboard, archive and Wall ordering
  retain their established behavior.
- No backend change, dependency, font, asset, fetch or idle animation loop.
  The final app still has 90 modules, three startup/four Home and 57 shared
  styles in one request. New measurements occur on tab selection, not scrolling.

## Verification

- `pnpm check`: 2,404 tests / 291 files, plus release/themes/types/names/build.
  Final focused Home/week/briefing/motion tests also pass (29 tests / 5 files).
- 347 focused browser checks cover Light/Dark at 320/390/768px, one heading,
  content-first spacing, source-week labeling, all four tabs, 200% root text,
  full long names, paired exact forecasts, all six games, three leaders in all
  six positions, no name/score collisions, rail visibility, Comfortable text,
  keyboard wrapping, empty/hold/loading/unavailable states and text contrast.
- Native tab review: 31 checks, including partial swipes, preview continuity,
  reversing/regrabbing an arrival, vertical scrolling, reduced motion and
  cleanup. Existing weekly phase review passes 12 mobile Light/Dark cases,
  focus/scroll stability, saved choices and cleanup.
- Actual built Home uses real league data read-only in both themes. All four
  views fit and have readable contrast; Week 8 is labeled once, and its first
  forecast retains Deadly 108.5 / Team Lafountain 100.0 in the paired UI.
  These are observed forecasts, separate from the live scoreboard. Requests
  that could mutate production data are blocked in the isolated browser.
- Physical phone frame pacing and screen-reader speech remain unmeasured.

Screenshots and concise check results are in [week-ahead-finish-1517/](week-ahead-finish-1517/).
