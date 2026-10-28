# Clubhouse reading and disclosure motion — 1.505.0

The Clubhouse used similar visual emphasis for navigation, the matchup and
secondary information. Mobile matchup choices also formed a long vertical list.
This pass keeps the existing features and gives them a clearer reading order.

## Presentation

- Matchup choices form a compact native horizontal rail on phones. All games
  remain available, selected states are visible, and complete names can wrap.
  Wider screens retain a grid. Native scrolling does not switch Clubhouse tabs.
- Quiet week controls and flatter section surfaces leave more room for the
  selected matchup. Scores are larger, names have clearer emphasis, and the
  portrait outlines and subtle background washes follow existing team accents.
- Supporting stats, timelines and the DFL file use consistent header heights,
  rules, chevrons and spacing. Controls share the existing Book/Trade scale.
- Clip groups retain the two-column grid and complete 16:9 image windows.
  Stronger three-line headlines, clearer game headings and quieter duration
  badges improve scanning without adding explanatory copy or extra cards.
- Rankings keep their existing reversible intrinsic-grid expansion, shortened
  to the same 260ms rhythm as the new disclosure motion.

## Native disclosure behavior

`disclosure-motion.js` adds finite height transitions to Clubhouse's supporting
sections and the existing trade receipt reader. Summaries retain native Enter,
Space and Tab behavior. Rapid taps reverse from the currently painted height.
Live patches or lazy receipt content retarget an opening within its original
deadline. Finished animations leave natural height, with no retained pixel size.

Observers exist only during an active transition. Rotation, leaving a tab,
Motion off, reduced motion and route teardown release the animation. There is
no new scroll handler, polling timer, image asset or font. The offline shell
includes the new helper and stylesheet; shared CSS remains one request.

## Validation

- `pnpm check`: 2,351 tests / 284 files, release markers, themes, typecheck,
  names and production build. Bundle: 90 modules, three startup / four Home.
- `capture-disclosure-motion.py`: 97 checks over 320/390/768px in Light/Dark.
  Actual position tables and trade receipts cover mid-flight reversal, keyboard
  navigation, live patches, lazy content, summary position, rotation, hidden
  tabs, rapid taps, Motion off, reduced motion and cleanup. The receipt test
  runs through the actual shared page-motion controller.
- `capture-clubhouse-live.py`: 216 checks, including the real Clubhouse page,
  compact chooser, side-by-side lineups, clip grids, game/player search, native
  browsing swipes, video viewer, NFL plays/stats, routes, contrast and controls.
- Existing Power and Trade browser suites passed, including expanded rankings,
  200% text, receipt routing, three-team packages and trade ownership safeguards.

All browser data is isolated fixture data with backend writes blocked. Test
portraits and clips are stand-ins. No production member, trade, wager, push or
league record was created. Physical iPhone frame pacing and VoiceOver were not
measured here.

## Inspected mobile screenshots

- [Clubhouse — Light](clubhouse-polish-1505/entry-light.png) · [Dark](clubhouse-polish-1505/entry-dark.png)
- [Clips — Light](clubhouse-polish-1505/clips-light.png) · [Dark](clubhouse-polish-1505/clips-dark.png)
- [Expanded stats — Light](clubhouse-polish-1505/stats-light.png) · [Dark](clubhouse-polish-1505/stats-dark.png)
