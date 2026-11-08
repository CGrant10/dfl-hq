# Sports desk refinement — 1.563.0

Visual references: the user-approved Matchup Desk/printed-ticket direction from
1.562.0, plus the actual production broadcast and NFL game-header captures made
before this refinement. The first daily broadcast and printed slip artwork stay
in use. This is an extension of the existing product, not a new visual concept.

## Evidence and comparison

Source baselines: `/workspace/dfl-finish-1563/broadcast-{award,metric}-before.png`
and `/workspace/dfl-finish-1563/desk-before/dark-390-fantasy.png`.
Implementations: `/workspace/dfl-review/editorial-dark-{0,2}.png`,
`/workspace/dfl-finish-1563/desk-after/dark-390-fantasy.png`, and
`/workspace/dfl-finish-1563/interactions/390-dark-{current,ticket}.png`.
Combined comparisons (opened and inspected): `comparison-broadcast-award.png`,
`comparison-broadcast-metric.png`, `comparison-nfl-header.png` in
`/workspace/dfl-finish-1563/`. Component broadcast images are uniformly displayed
at 390px width; NFL captures use 390×844 CSS pixels, deviceScaleFactor 1. No image
stretching or device frame is added. Broader checks cover 320/390/430/768px and
200% text. Same synthetic teams/scores are used in the NFL before/after pair.
Bet examples are isolated fixtures; compiled current-data Home/Book screenshots
are in `/workspace/dfl-finish-1563/actual/`.

## Findings and iteration history

- The Book sorted open upcoming markets before locked current games. It now
  respects the league week order, includes settled current markets, and uses a
  closed native disclosure for future slates. A known current week without data
  shows an honest empty state. Future picks still work after expanding; closing
  never clears the draft. Current locked rows retain full information contrast.
- The first ticket-motion check caught lost opener focus: the refresh temporarily
  disables its button, moving activeElement away. The origin button is now
  explicitly retained, with a keyed replacement fallback. All focus/scroll tests
  pass after the fix. Closing invalidates pending rendering, so a late result
  cannot revive the preview. Escape, repeated Escape, immediate dismissal and
  route cleanup are covered.
- Broadcast and NFL header comparisons found no remaining actionable P0/P1/P2
  issues. Team-colored score rules and readable tabular figures replace NFL
  backdrop watermarks/glows. Broadcast kicker/icon clutter is reduced, records
  have a distinct number column, and results have paired score columns. Existing
  long-name fitting, image containment, routes and controls remain functional.

## Fidelity surfaces

Typography: local Inter, compact labels, strong aligned tabular scores/prices,
full wrapped names and the existing receipt type. Current, locked, final and
pending meanings remain explicit; cosmetic motion does not imply a result.

Spacing/layout: ruled flat surfaces, paired scores and consistent margins.
Current betting games lead. Future weeks have a 48px summary with a genuine
chevron affordance, keyboard semantics and reversible opening. View slip opens
from the existing ticket row; the placeholder reserves the eventual preview
space. Exit returns to the row without scrolling it away.

Colors/tokens: shared Medicine Wheel Dark/Light tokens for surfaces, text, rules,
focus and action selection. Authentic NFL colors remain identity cues. The
printed slip remains intentionally light. No extra theme option or old blue.

Images/icons: actual member/NFL photos/logos, supplied round DFL branding and
existing broadcast player/chip artwork are reused. No generated replacement,
mascot or shield introduced. The accordion uses the existing official Bootstrap
chevron. Decorative header watermarks are removed; no substitute art is drawn.

Content/actions: existing precise story destinations and score metadata stay
intact. Plays and Fantasy remain separate and retain game swiping, live updates
and play detail. View slip retains Share/Save/text, pulls/dismissal and official
settlement behavior. No new request cadence, data provider, mutation or timer.

## Validation

- `pnpm check`: 2,507 tests / 303 files; release, theme, type, name and build checks
  pass. Final CSS build retains 88 modules, three startup/four Home modules and
  one shared-style request. No new page image/font request.
- New persistent `tools/capture-sports-desk-finish.py`: 80 checks at 320/390px in
  Light/Dark, including current-first/closed-early, draft retention, keyboard and
  interrupted disclosure, source motion, app-motion-off, Reduced Motion,
  focus/scroll return, repeated Escape, quick close and route cleanup. Added to
  the existing league-wire CI job. Fixture-only account data; no remote writes.
- Existing Book browser checks pass at 320/390/430px with 200% type, selected
  contrast, claim retry/single-flight/balance/navigation, props, Pick’em and rapid
  tabs. Existing share suite passes 75 checks including native-share user gesture,
  Save/text/focus, full tickets and unchanged other share types.
- Broadcast: 90 normal and 56 enlarged layouts pass, with replay/pause, touch,
  keyboard, image containment and complete text. Editorial suite passes its
  routed receipt/picker/visibility tests with zero offscreen scroll layout reads.
- NFL desk: 126 checks pass for Plays/Fantasy, scores, player order, game changes,
  loading/error/recovery, large text, reduced motion and teardown.
- Compiled current-data Home/Book in both themes render without browser errors or
  horizontal overflow (four route/theme captures). Claims are intercepted; no
  real wager, league mutation, share delivery or message is performed.

Physical iOS frame pacing, native share delivery and VoiceOver speech were not
measured. No remaining P0/P1/P2 visual issues; platform rasterization is P3.

final result: passed
