# NFL Game Center — 1.567.0

The user chose **DFL colors with Sleeper's layout**. This is a refinement of the
existing production Clubhouse and Replay controller, not a new mock app.

## Source, rendered evidence and normalization

Visual truth: Sleeper's published native NFL Game Center image in
https://sleeper.com/blog/sleepers-app-redesign-whats-new/ (2023), saved as
`/workspace/dfl-sleeper-1567/sleeper-official-game-screen-2023.png` (383×820).
The current public game page was also inspected at
https://sleeper.com/nfl/scores/was-commanders-nyg-giants-2026-11-12;
`sleeper-game-web.png`/HTML in that scratch root confirm category-organized NFL
box scores. The historical native image is a layout reference, not a claim about
the latest authenticated iOS build.

Rendered primary evidence: `gamecast-final/390-{light,dark}-stats.png` in the same
scratch root. Chromium viewport 390×844 CSS px, deviceScaleFactor 1. The actual
production modules run with a deterministic SF 7 / LAR 14, Q1 11:10 fixture matching
the reference state. These synthetic reference stats are test-only. Real ESPN
player photos and NFL logos were downloaded for visual review; no placeholder
portraits were used in the comparisons. Persistent offline regression tests have
explicit fixture-image fallbacks.

`comparison-stats.png` puts the source and both rendered themes in one input.
The source's native status/home bars are cropped (y49 through y815); the content
is uniformly scaled from 383 to 390px wide. The implementation's unused fixture
page offset is cropped at y60. No screenshot is stretched or used as app content.
The combined image was opened and inspected. `comparison-leaders.png` and the
individual 320/390/768px normal/large captures provide focused table/name/score
review. Final 200% text evidence is `gamecast-large-final/320-{light,dark}-large.png`.
Additional Plays and Fantasy captures are in those directories. Compiled real-data
Clubhouse evidence is `actual-verified/`, with the same three views and a second NFL game.

## Comparison history and fixes

- [P2, fixed] The initial field spot inherited a centering transform while its
  left edge was overridden. It drifted outside the field, hiding the down label.
  Evidence: `gamecast-first/failure.png`. The caption now uses one centered,
  content-width position and the existing dark field label surface. Post-fix:
  `gamecast-final/390-{light,dark}-stats.png` and the combined comparison.
- [P2, fixed] A legacy live-state clock underline made the score header appear to
  contain a second selected tab. The scoped score-clock rule removes it. The
  latest-play row also keeps Replay's 44px target without expanding the whole
  row. Post-fix: the same normal-size comparison.
- [P2, fixed] At 200% text the paired score names wrapped into narrow vertical
  columns (`gamecast-final/320-dark-large.png`). The compact container now stacks
  each team name above its score. Post-fix: `gamecast-large-final/320-dark-large.png`,
  opened and checked; names remain whole and the middle clock stays separate.
- [P2, fixed] An unconditional selected-game data attribute produced mutations on
  unchanged automatic updates. It is written only when selection changes. The
  existing live-refresh suite now passes its no-mutation assertion.

- [P2, fixed] Compiled real-data captures (`actual/`) exposed quarter cells with
  only `displayValue` and End of Game rows carrying repeated coordinates. Quarter
  decoding now accepts the provider's display string while keeping zero/unknown
  distinct. Administrative rows remain in the play feed but do not become new
  field plays. Post-fix compiled screenshots are in `actual-verified/`; the model
  tests and the terminal-event browser fixture cover both provider shapes.

## Required fidelity surfaces

**Typography:** existing locally hosted Inter, compact 13px play descriptions,
14px play headlines, 12px leader names, tabular 30px NFL scores, smaller secondary
stats. Full play descriptions remain visible. The reference's rounded native
font is intentionally adapted to the approved DFL font. No added font request,
vertical names at enlarged text, display uppercase leakage or clipped stat cells.

**Spacing/layout:** native horizontal NFL chips, latest-play strip, perspective
field, paired scores/clock, separate Stats/Plays/Fantasy, quarter board and paired
PASS/RUSH/REC leaders follow the source order. Full team box scores follow the
leaders. One game rail replaces the duplicate board/dropdown. The source's
Feed/Chat tabs are intentionally omitted. Existing 44px touch targets add some
height compared with the source. Tables scroll within their own regions and
cannot trigger a game swipe. Fantasy retains its established aligned two-column
position order and full names.

**Colors/tokens:** Medicine Wheel Light/Dark surfaces, text, rules, focus and
crimson selection use shared tokens. Authentic NFL logos/colors and semantic
field lines retain their identity. No borrowed Sleeper blue/pink palette or new
theme entries. Normal Stats contrast is measured in all six viewport/theme
contexts; original feed/Fantasy and Clubhouse suites also check contrast.

**Imagery/assets:** authentic ESPN headshots and NFL logos have correct subjects,
contained crops and no distortion. Leader photos fall back to the authentic NFL
team logo. Existing functional SVG field data plot is retained: its route lift
illustrates verified start/end yard lines, not tracking telemetry. No generated
mascot, decorative drawing, rasterized UI, extra shield or fabricated logo.
Refresh uses the unmodified Bootstrap arrow-clockwise icon under the existing MIT
license; original chevrons and shared motion controllers remain.

**Copy/content:** labels are Stats, Plays, Fantasy, Scoreboard, Game leaders and
Passing/Rushing/Receiving/Kicking. The raw NFL box score preserves provider order,
stat strings, real zeros and unknown values. Leaders require recorded activity;
ties are marked. Future quarters remain unknown; totals use observed NFL scores.
Fantasy points use league data and are not substituted with NFL scoring. A final
non-coordinate event keeps the last verified field spot and latest description,
explicitly labeled Final spot, rather than inventing a new play.

## Verification and remaining limits

`pnpm check` passes 2,537 tests / 306 files, release/theme/type/name checks and build.
Eleven new model tests cover provider order, zeros/unknowns, independent and tied
leaders, negative yards, pregame data, overtime, provider display-value quarters, administrative events
and safe names/content. Build:
88 app modules, three startup/four Home modules, one shared stylesheet request.
No new provider, polling cadence, timer loop or weekly PPR read for raw Stats.

Browser verification uses actual controllers with blocked account/league writes:
new Game Center suite 108 checks, existing game swipes 60, Replay window 88,
live refresh 72, plus existing NFL desk/finish and full Clubhouse journeys.
Coverage includes real touch rail browsing without selection, explicit taps,
reverse swipes/late responses, unchanged DOM, reading restoration, video identity,
200% text, 44px controls, contrast, Reduced Motion/app-off and teardown. The new
persistent suite is wired into the existing NFL-center CI job.

Compiled actual-data checks passed in both themes across Stats/Plays/Fantasy,
explicit selection of a second game, actual quarter values and the final verified
field spot. All visible descriptions, game controls, page edges and selected
states were inspected. No actionable P0/P1/P2 finding remains. Physical iOS frame pacing,
VoiceOver speech and the latest authenticated native Sleeper build are not measured.

final result: passed
