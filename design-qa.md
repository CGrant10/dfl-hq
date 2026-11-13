# NFL Scores visual refinement — 1.569.0

The approved full-screen Live/Stats structure from 1.568 remains. This pass applies
the current DFL Clubhouse visual direction: compact Inter typography, flat score
hierarchy, precise rules, modest control radii and finite, quiet motion.

## Current-run evidence

Scratch root: `/workspace/dfl-scores-1569/`. `before/` captures the compiled 1.568
NFL viewer and the actual Clubhouse in both Medicine Wheel themes. These were
inspected before editing. `mobile-verified/` captures the final controller at
320, 390, 430 and 768px in Light/Dark, including normal and 200% text, team tables
and Live/Stats. The fixture is test-only and never written to production.
`actual-verified/` contains the final compiled, real-data verification. Both
themes and final screenshots were inspected before merging.

## Changes and findings

1. Game selection and view controls: round pills and a floating 200px tab strip
   felt disconnected from Clubhouse. Game capsules now use restrained 6px corners;
   the full-width Live/Stats rail retains its smooth shared underline. The
   away/Fantasy/home selector uses an inset sliding surface, with app/system
   reduced-motion overrides. Actual touch targets remain at least 44px tall.
2. Live score and field: scores lead above authentic NFL marks and names, with a
   dedicated centered phase/channel column. The live quarter/clock parser now
   handles the provider's whitespace correctly. The field has one quiet surface;
   result and Replay participate in its header layout so they cannot collide.
   Source play details, finite field motion and real position data are preserved.
3. Fantasy: lighter position rules, consistent row separators, stronger actuals
   and quieter projections improve scanning. A shared subgrid aligns opposing
   names and scores when only one owner name wraps. Blank and unequal sides stay
   aligned. The redundant league label becomes DFL Fantasy with the actual week.
4. Phone edges and enlarged text: consistent 14px gutters, team abbreviations in
   constrained controls, and narrower quarter-cell padding prevent vertical team
   labels and keep quarter totals visible without sideways table scrolling.
5. Feed: 14px headlines, 12px complete descriptions and quiet metadata retain all
   official detail. Row rules and centered selectable headlines give each play
   a clear reading area. The native filter keeps its accessible phone font size
   with a flat surface, rather than an oversized filled input box.

## Verification and limits

`pnpm check` passes: 2,547 tests / 307 files, release versions, theme audit, type
checks, identifier checks and production build. The build retains 88 modules,
three startup/four Home modules and one shared stylesheet request.

Browser verification passes 226 mobile Scores checks (including uneven-owner
alignment, 200% Live bounds and all quarter totals fitting), 127 NFL desk checks
and 88 clip-viewer checks. Six additional motion checks verify the selector moves
toward its target and settles in both themes, with negligible transition duration
under system Reduced Motion and the actual persisted app motion-off preference.
The shared reduced-motion reset uses a 0.001ms duration rather than a literal 0s.

Compiled real-data Light/Dark checks pass full-screen bounds, contrast, game
selection, Live/Stats, actual quarter totals and Back restoration. Final screenshots
were inspected. Existing scoring, caches, polling, game
swipes, player cards and clip navigation are retained. No new imagery, dependency,
font, backend request or animation loop was introduced. NFL logos/portraits use
existing authentic sources with their existing fallbacks. Theme tokens retain
Medicine Wheel Light/Dark and NFL identity/semantic colors.

Physical iOS/Android frame pacing and VoiceOver/TalkBack speech remain unmeasured.
No claim of pixel-identical native rendering or full accessibility certification.

final result: passed
