# Home broadcast presentation — 1.511.0

The Home broadcast keeps its wide frame and independent daily opener. Stories
now use compositions suited to their content, with boxy display type, quiet
surfaces, small category marks and one clear action. Normal-size rotation keeps
the same height, so the rest of Home does not move.

## Changes

- Champion and Chip Eater use complete house artwork in a separate art column,
  with a subtle diagonal panel. Neither uses a member avatar, logo or splatter.
- Trades use full-width compact rows instead of three narrow columns. Each row
  pairs its team with the lead player and remaining-player count. Sourced balance
  and the exact receipt link stay visible; the accessible summary includes every
  routed player. Trades larger than three teams show their total team count.
- Matchup results have a ruled score area, full team names and confirmed scores.
  Rivalries use their actual headline with a separate series record. Metrics keep
  a single numeric anchor beside their copy.
- Text no longer runs an extra entrance animation after the frame transition.
  Decorative artwork has a short fade. Native finger tracking, interruption,
  reverse swipes, pause, first-read timing and one-pass editions remain intact.
- Enlarged system text reflows metadata, art, values and result rows. The deck
  reserves extra room at larger text sizes without changing height per story.
- Automatic news and trade stories expire after 72 hours, including generated
  pins. Commissioner-authored stories and explicit editorial pins remain. When
  several dated automatic stories share a source, the newest confirmed news or
  trade occupies that source's original ranked slot. Undated stories are retained;
  event priority is not inferred from publication time. Existing scoreboard and
  exact nearby trade-receipt deduplication remain unchanged.

## Validation

- `pnpm check`: 2,387 tests across 290 files, release versions, theme colors,
  typecheck, names and production build. Final theme/type/name/build checks pass.
- 90 wide layouts at 320/390/768px in Light/Dark: content bounds, image/copy
  separation, complete artwork, readable headlines, contrast, 44px transport
  targets, visible active segments and stable frame heights.
- 56 enlarged layouts at 125% and 200% root text in both themes: bounds, art and
  series separation, full player names and unchanged height between stories.
- Existing 52 editorial art-direction layouts pass. Eight transport/theme checks
  cover keyboard focus, pause, larger names and Motion off. Real observer/timer
  checks pass for below-fold reading, full initial dwell, offscreen pause, manual
  selection, short viewports, reduced motion and teardown in both themes.
- Touch gestures reverse and wrap without changing the route. Completed editions
  stop, explicit replay starts at the opener, and new content is readable again.
- The production bundle remains 90 modules, three startup/four Home. 57 shared
  styles ship in one request. No backend endpoint, dependency, polling or animation
  loop was added. Browser fixtures use isolated data and block external writes.

Physical-device frame timing and screen-reader announcements were not measured.

## Inspected screenshots

- [Champion Light](broadcast-presentation-1511/wide-light-390-1.png) · [Dark](broadcast-presentation-1511/wide-dark-390-1.png)
- [Chip Eater Light](broadcast-presentation-1511/wide-light-390-2.png) · [Dark](broadcast-presentation-1511/wide-dark-390-2.png)
- [Three-team trade at 320px](broadcast-presentation-1511/wide-light-320-4.png) · [Dark at 390px](broadcast-presentation-1511/wide-dark-390-4.png)
- [Rivalry](broadcast-presentation-1511/wide-light-390-6.png) · [Playoff picture](broadcast-presentation-1511/wide-dark-390-8.png)
- [200% long award name](broadcast-presentation-1511/wide-light-200pct-12.png) · [200% trade](broadcast-presentation-1511/wide-dark-200pct-4.png)
