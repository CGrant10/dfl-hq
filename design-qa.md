# Supplied mobile Scores design — 1.568.0

## Visual target and approved scope

The four native Sleeper screenshots supplied in this conversation are the source:
(1) scrolled Fantasy position groups, (2) quarter board/Fantasy selector/QB/RB,
(3) scrolled player-led Live feed and (4) paired score plus perspective field.
They replace the older 2023 public reference used for 1.567.0. Source images were
inspected inline; no downloaded original raster is available in the workspace.
The review compares their content regions/proportions at the 390px phone target;
it does not claim a pixel-diff or a byte-for-byte source-image comparison.

The user selected DFL colors, full-screen viewing from Clubhouse, stable player
order, and the core layout only. Probability chart, betting drawer, reactions and
comments are deliberately omitted. Device status/navigation bars are not app UI.
DFL uses its existing Inter font, Medicine Wheel surfaces and authentic NFL imagery.

## Rendered evidence

Scratch root: `/workspace/dfl-scores-1568/`. Actual controller captures:
`scores-verified/{320,390,430,768}-{light,dark}-{live,stats,team,large}.png`.
Chromium CSS viewport widths match those names, height 844px, density 1. The frozen
WAS 3 / NYG 0 Q2 fixture uses the source players, displayed totals and projections;
it is isolated test data, never production content. Authentic ESPN headshots and
NFL logos are supplied to visual captures. Offline tests use explicit fixture
fallback images. `actual-final/` contains compiled app renders using real public
NFL data and the league's existing read APIs, all account/league writes blocked.

The supplied images were checked against the normal and scrolled rendered states.
Focused review covers the short game capsules, selected state, quarter table,
mirrored QB/RB/WR/TE rows, actual/projection stacks, dotted position separators,
player portraits, complete play text and field labels. Raw source pixels are not
available for a combined raster board; the inspected source remains the inline
reference in this conversation.

## Findings and iterations

- P1 fixed: the real app's Clubhouse entrance transform constrained a fixed child
  to a 358×154px containing block. The viewer is now portaled directly under the
  route root. Compiled checks verify a 390×844px viewport, safe Back navigation,
  restored Clubhouse state and inert covered navigation. Evidence: `actual-debug/`
  versus `actual-final/`. This was not observable in the isolated component alone.
- P2 fixed: the filled game capsule inherited a low-contrast muted status label
  from the page's generic small-text rule. Explicit inherited foreground on the
  capsule's actual content surface fixes Light/Dark contrast. Primary fixtures
  now include the production page-system attributes as well.
- P2 fixed: the old two-layer game board/dropdown and three workspace tabs did not
  match the source. There is now one compact browsable rail, a paired score above
  the field in Live, and two pinned Live/Stats tabs. Stats begins with the quarter
  board and away/Fantasy/home control; it does not repeat the Live hero.
- P2 fixed: player rows previously carried pictures, redundant team headers and
  unsegmented positions. The mirrored position groups now use abbreviated names,
  current owner lines, aligned two-decimal actuals/projections and compact stat
  lines. Empty opposing slots preserve alignment. Zero-only stat noise is omitted
  without hiding genuine recorded 0.00 scores. Names reflow at enlarged text.
- P2 fixed: full-screen routing could discard the unavailable-video message.
  Missing clips now replace the dead-link entry with the exact NFL game and a
  persistent, scoped notice. Moment links retain their exact focused play.

## Required fidelity surfaces

Typography: local Inter, 13px player names, 14px actuals, 12px projections,
10–11px owner/position/stat metadata, 15px Live headlines and 12px full descriptions.
Full surname remains in the title/accessibility label; text never collapses to
single-letter columns. Scores use tabular figures. Native font/color differences
are deliberate adaptations to the approved DFL visual system.

Spacing/layout: compact visual capsules retain 44px control heights. Stats uses
mirror columns with inner points, position dividers and shared row heights; no
large gray player boxes. The player row is the tap target. Live uses portraits,
down/distance, spot and clock, an identifiable outcome and the complete official
description. The hero scrolls away while rail/tabs remain pinned. Full-screen
safe-area padding excludes the underlying app header/navigation.

Colors/tokens: shared background/text/body/line/action/accent tokens in Medicine
Wheel Light/Dark. Filled selected capsules and segmented controls have explicit
contrasting text. NFL identity colors and semantic field markings stay intact.
No new theme option or retired crest palette. Actual rendered contrast is checked.

Image quality: authentic NFL logos and ESPN player headshots, with an NFL fallback
that survives live patches. Fantasy rows intentionally omit portraits, matching
the source. Live and field endpoints show the identified athlete. The field is
an existing functional SVG data plot with goalposts, a finite travel path and
verified endpoint/yardage labels; no generated art or fictional tracking routes.
Existing licensed chevrons/refresh icons are reused.

Content/data: one DFL Fantasy context rather than an inert league dropdown. Actual
owned points stay authoritative; unowned weekly stats and projections use DFL's
real scoring settings, not a PPR preset relabeled as DFL. Unknowns remain em dashes,
real zero/negative totals survive, pregame actuals are unknown, and projected
players can appear before recording a stat. Stable ordering survives score swings.
No forecast invented from averages or from game-clock extrapolation.

## Interaction, performance and verification

`pnpm check`: 2,547 tests / 307 files, plus release, theme, type, name and build
checks. Ten new model cases cover source totals/projections, pregame players,
unknown/zero/negative values, custom scoring, scope/ambiguity, stable order,
mirrored markup, athlete resolution and nullified plays. Existing tests remain.

Browser suites: mobile Scores 202, full Clubhouse 333, NFL desk 127, game swipes
60, live refresh 72 and clip viewer 88. The new suite replaces the obsolete public
Gamecast visual target in the existing NFL-center CI job; the former command is a
compatibility entry point. Coverage includes real touch rail browsing without
selection, row swipes without accidental cards, reverse/late-response handling,
view/filter reading restoration, player-card focus return, exact clip/play return,
missing-video fallback, 200% text, Reduced/app-off motion and teardown.

The 88-module build retains three startup/four Home modules and one shared CSS
request. Projection reads start in Fantasy, share the existing week cache and
refresh at most every 30 minutes. Weekly actuals keep the existing bounded refresh.
Large immutable catalog/projection indexes are reused during live paints. Field
movement is finite, unchanged/scroll updates do not restart it, and background or
covered views pause. No chart, social backend, migration or paid provider added.

Final compiled real-data verification passes in Light/Dark: full-screen bounds,
actual quarter scores, DFL Fantasy totals/projections, second-game selection,
contrast, inert covered navigation and exact Clubhouse Back restoration. Final
screenshots in `actual-final/` were inspected before merging. Physical iOS/Android frame pacing,
VoiceOver/TalkBack speech and byte-level source screenshot fidelity are unmeasured.

final result: passed
