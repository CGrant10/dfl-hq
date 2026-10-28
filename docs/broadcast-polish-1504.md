# Home and broadcast polish — 1.504.0

The non-opening broadcast slides had sparse layouts and detached artwork.
The wide carousel now uses one frame and a quiet transport strip, with a
different composition for each story type.

- Awards pair a large team name with complete, contained house artwork. The
  champion and Chip Eater use their own existing illustrations, never member
  profile pictures or the app shield. Larger text gives the name more width.
- Results lead with the two teams and large tabular scores. The roast sits
  beneath them. Only known final football scores produce the labeled margin;
  live scores, missing scores and golf do not produce a final point margin.
- Trades show all participating packages in the same frame and retain the
  sourced value/group balance beside the exact receipt action. The complete
  player packages remain in the link's accessible name and full receipt.
- Archive, odds, rivalry, injury and scout stories keep distinct numerical,
  image or roster compositions with shared type, alignment and footer styling.
- Controls retain 44px targets with smaller glyphs and progress segments. A
  theme-colored strip keeps them legible over the opener's illustration.
  Long editions scroll only their segment rail to reveal the active item.
- The short copy/art reveal shares one timing. Direct drags keep the existing
  finger tracking and spring settlement. Motion off and reduced motion disable
  the reveal. No new polling, scroll loop, image downloads or fonts were added.
- Home uses fewer divider lines, tighter section spacing and current theme
  text tokens for section-jump actions. Jumps have no persistent selected state.
  The independent daily opener and Wall-last ordering remain intact.

## Validation

- `pnpm check`: 2,351 tests in 284 files, themes, release markers, names,
  typecheck and production build passed. The bundle retains 90 modules,
  three startup modules and four initial Home modules.
- `capture-broadcast-wide.py`: 90 layouts across 320/390/768px, Light/Dark,
  complete art, separate copy/art zones, no horizontal overflow, stable frame
  height, readable headlines, 44px controls and a visible active segment.
  Actual touch swipes in both directions, one-pass autoplay, manual replay,
  returning editions, changed content and reduced motion passed.
- `capture-broadcast-polish.py`: eight Home/appearance cases. All five jump
  labels exceed 4.5:1 in both defaults (11.95:1 Light, 14.13:1 Dark). Keyboard
  focus, pause, 125% text with a long award name and Motion off passed.
- `capture-home-rhythm-review.py`: 18 phase/theme/width cases plus three
  delayed-data guards. Background updates do not reshuffle a scrolled visit.
- `capture-home-score-review.py`: 18 checks including native/fallback paths,
  touch fling at 4x CPU, score changes, modal cleanup and motion settings.

Browser reviews use actual production components with isolated league fixtures
and blocked external backend access. Fixture portraits are stand-ins, not
claims of actual player footage. Public release smoke checks are read only.
Physical iPhone frame pacing and VoiceOver were not tested in this environment.

## Screenshots

Each pair was inspected in Light and Dark at 390px. The wide gallery also
includes 320px and 768px checks.

- [Home — Light](broadcast-polish-1504/home-light.png) · [Dark](broadcast-polish-1504/home-dark.png)
- [Champion — Light](broadcast-polish-1504/champion-light.png) · [Dark](broadcast-polish-1504/champion-dark.png)
- [Chip Eater — Light](broadcast-polish-1504/chip-light.png) · [Dark](broadcast-polish-1504/chip-dark.png)
- [Matchup — Light](broadcast-polish-1504/result-light.png) · [Dark](broadcast-polish-1504/result-dark.png)
- [Three-team trade — Light](broadcast-polish-1504/trade-light.png) · [Dark](broadcast-polish-1504/trade-dark.png)
- [Larger text — Light](broadcast-polish-1504/large-text-light.png) · [Dark](broadcast-polish-1504/large-text-dark.png)
