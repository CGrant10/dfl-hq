# Clubhouse live room and roster highlights — 1.486.0

Clubhouse now owns the interactive live experience. Home retains its compact,
animated matchup reference and links directly to the selected Clubhouse matchup;
it no longer creates a separate GameDay watch dialog or the lower Home live/
player-leader section. A smaller Home controller keeps score freshness, retry,
phase changes, forecast handoff and the existing Home weekly/broadcast model.

Clubhouse has Matchups, Highlights, Leaders, Overview and Recap. The existing
side-by-side lineups, player-card transitions, Red Zone Watch, score effects,
saved moments and recap tools stay in the matchup. Leaders brings the full
player board, hot/cold filters, optional bench, weekly stat lines/PPR averages
and NFL scoreboard into the same page. The shared score refresh runs for
Matchups and Leaders; selecting an old week remains explicit. A regular visit
opens the latest synced week, and remembered tabs are scoped to that week.

Highlights offers Your team, This matchup and League. Your team uses the actual
weekly fantasy roster (including bench) for the selected week. Clips must name
a roster player and match their NFL team; the game ID must be in the selected
NFL week. Matchup includes both selected rosters. League includes the available
clips in that week's NFL games. The shared player supports inline video,
chronological playback, next clip and source fallback. The existing Tuesday
06:00 Central/publisher expiry still applies, so this is a current-week reel,
not a permanent archive of footage.

Matching deliberately requires a complete player name, with punctuation,
apostrophe, possessive and suffix normalization. A caption using only a surname,
an unrecognized nickname or an unlisted player may be omitted. It does not
substitute all plays from someone's NFL team or infer fantasy scoring from a
video. No new video source, schema, paid service or backend function was added.

## Validation

- Full `pnpm check` passes: 265 files / 2,215 tests, including five new roster
  matching tests. Themes, types, names, release version and production build pass.
  Bundle: 89 modules / 3 startup / 4 Home.
- 88 dedicated browser checks pass at 320/390px in Light/Dark, using the actual
  Clubhouse page renderer, live center and Home preview controller. Covers
  roster/matchup/week filtering, native video from clip 1, lazy loading, shared
  metadata across scope switches, rejected late requests, failed reads,
  hot/cold/bench controls, NFL scoreboard, compact rows/portraits, 44px targets,
  4.5:1 text contrast, overflow, reduced motion and video shutdown on leave.
- Existing 112 Home reel checks pass after making its shared UI configurable.
- The real compiled app's first-launch and route teardown checks pass for both
  plain launch and #/home. No uncaught errors or league writes.
- Screenshots reviewed for Home preview, Highlights and Leaders in Light/Dark at
  both phone sizes. The dedicated fixture uses a synthetic decoder test video
  and a portrait image for deterministic sizing; it does not claim these are
  new production highlights. Existing publisher-native playback was verified in
  1.484.0 and is unchanged.

Evidence: `/workspace/dfl-clubhouse-live-review/` and
`/workspace/dfl-highlight-review/`. Native installed Safari/iOS remains
unverified. Available clips still depend on publisher captions and expiry.
