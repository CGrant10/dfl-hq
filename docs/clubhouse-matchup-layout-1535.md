# Clubhouse matchup layout — 1.535.0

Reference: ESPN's current [App Store matchup screenshot](https://apps.apple.com/us/app/espn-fantasy-sports-more/id555376968)
and its [published matchup behavior](https://espnpressroom.com/press-release/espn-fantasy-football-30th-anniversary-new-design-new-features-all-new-fantasy-app-for-2025/).
The screenshot currently shows hockey; this change adapts the shared matchup
structure to DFL football data, photos, effects and Medicine Wheel themes.
This is public-screen research, not an audit of ESPN's signed-in mobile app.

- Slim logo/score matchup chips replace the stacked mini score cards. Full names
  and exact scores remain in accessible labels; the selected matchup's full
  names and scores appear in the main header. Tap, swipe, keyboard and routing
  keep one selection. Existing short logo landing motion is retained.
- Team logos sit outside the prominent totals, with team names and actual starter
  status underneath. An obsolete five-row subgrid no longer reserves empty space.
- Opposing player scores sit toward the center position column. Player pictures,
  names, weekly stat lines, PPR averages, hot/cold effects and player-card entry
  remain available. Repeated team headings and old stat-line minimum heights are
  removed from this view. Enlarged text uses a stacked cell layout when needed.
- The duplicate League scoreboard heading is removed. Refresh scores and the
  motion toggle move into the existing Week & tools disclosure. The existing
  compact scrolling score reference continues to show full team names and totals.

No data source, score calculation, polling interval or photo preference changes.
No ESPN artwork, logos or proprietary fonts are used as DFL app assets. The
published screenshot is retained only as design-review evidence.

## Validation

`pnpm check`: 2,425 tests in 293 files, release markers, themes, types, names and
production build pass. Final CSS rebuild and theme scan also pass.

313 Clubhouse interface checks pass, including contrast, touch targets, actual
scrolling-score identities, refresh retention, player-card actions, clips and
live NFL views. 320 layout checks cover five widths, Light/Dark and four text /
spacing settings including 200% text; score/logo separation is checked explicitly.
20 final compact-entry checks pass. Read-only compiled-app touch checks pass forward/backward paging with
six actual league matchups available at 320/390px in both themes without page errors.
128 dedicated real-touch checks pass across all six fixture matchups, including
logo motion and Reduced Motion. Evidence is linked below.

[Visual comparison](clubhouse-matchup-layout-1535/comparison-full.png) ·
[Focused comparison](clubhouse-matchup-layout-1535/comparison-focus.png) ·
[Light](clubhouse-matchup-layout-1535/390-light-clubhouse-default.png) ·
[Dark](clubhouse-matchup-layout-1535/390-dark-clubhouse-default.png) ·
[Clubhouse checks](clubhouse-matchup-layout-1535/clubhouse-checks.json) ·
[Layout checks](clubhouse-matchup-layout-1535/layout-checks.json) ·
[Gesture checks](clubhouse-matchup-layout-1535/swipe-checks.json)

Browser evidence uses local Chromium touch emulation. Cloud Browser is unavailable
in this session. Physical iOS Safari, VoiceOver and ESPN's native gesture timing
remain unmeasured. Actual league screenshots stay local; committed DFL images use
isolated fixtures. See [design QA](../design-qa.md) for accepted adaptations.
