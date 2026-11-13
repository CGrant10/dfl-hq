# Player rows, live viewing and secondary desks — 1.573.0

Clubhouse matchup rows/leaders, NFL fantasy rows, player-card actions and Replay
controls now share compact Inter type, quiet metadata and consistent portrait
frames. Leaders use a smaller score scale and lighter slot labels. Matchup stat
lines retain their compact spacing, full names, full touch targets and thermal
scores. NFL fantasy keeps the mirrored positional layout, stable player ordering
and true league totals/projections; fixed score columns align the numbers across
position groups and a short Pts / Proj key identifies their order. Unknown values
remain unavailable rather than invented.

NFL play-by-play keeps all source descriptions visible. Each player play carries
its existing NFL team colors and a small authentic team-logo badge beside the
portrait; the selected field play has a clear accent. This uses the same team
images already present in the game rail, with no new data feed or polling.
NFL remains inline in Clubhouse with the shared navigation accessible.

Player-card/replay controls remove inherited display-font tracking, retain
44px targets and use the common selected/pressed surfaces. Replay selection and
Playing markers use the theme accent. Portrait-first opening/closing, fresh
card scroll state, focus return, media identity through minimize/restore,
reduced motion and teardown remain on the existing controllers.

History's trophy list drops repeated Season/DFL/Trophy Case labels, uses flatter
ruled rows, quieter Champion/Runner-up labels and more consistent year alignment.
History and Activity tab rails/unread markers now use the shared accent. Device
notification settings use compact Inter controls, flat checkbox rows, quieter
secondary text and the same header/close treatment as other sheets. Permission,
subscription, notification and player-data behavior is unchanged.

Evidence: /workspace/dfl-finish-1573/ includes before/ and nfl-before/ captures;
actual-final/ and large-final/ compiled public-league reads in Light/Dark at
390px and 320px/200% text; nfl-actual/ and nfl-large/ inline NFL/navigation checks; archive-verified/ final
alignment;
clubhouse/ real controllers with isolated feeds; scores/ positional alignment,
team badges and live field; player/ and sheets/ portrait motion; replay-final/;
activity-final/ and secondary/. Screenshots inspected for hierarchy, edges,
contrast, selection and full content. Provider writes were blocked/mocked;
fixture media was used for playback tests, not presented as real NFL footage.

Validation: pnpm check passes 2,547 tests in 307 files plus release, theme, type,
name and build checks. Browser suites pass 337 Clubhouse checks, 266 mobile Scores
checks, 43 player-finish checks, 37 player-motion checks and 88 Replay checks.
Activity/settings pass six theme/width cases, including touch dismissal/focus
and enlarged text. Secondary review passes 320/390/768px, four theme inputs and
two text sizes. Compiled real-data checks preserve side-by-side rows, exact
player-card return position, inline NFL controls and app navigation in both
themes at normal/enlarged text. Final CSS/theme/build checks follow the last
archive alignment refinement. The bundle retains 88 modules, three startup/four
Home modules and one shared CSS request. No dependency, backend, new artwork or
continuous animation added. Physical-device frame pacing and screen-reader speech
remain unmeasured.

# Daily desks and shared finish — 1.572.0

Trade suggestions keep every player visible, show the numeric value balance in
one header and give Analyze the primary action. Save remains directly available;
Pass, Compare, Edit and Keep live in a native More disclosure. Existing grading,
required roster drops, lineup/risk details and three-team destinations are
preserved. The menu measures available header/nav space on opening and resize,
supports outside dismissal and Escape/focus return, and removes its listeners
when leaving. Larger text stacks the owner/verdict and player packages instead
of squeezing full names into narrow columns. Search uses static offer-shaped
placeholders and a single honest status, with no simulated stats or extra reads.

Sportsbook keeps Board/My bets/Pick’em; its second three-tab row becomes a labeled
native market selector with actual week/season beside it. Current lines stay
prominent and early lines remain collapsed. Profile shows title/runner-up history
once in the trophy cabinet, retaining Career's fallback counts when lore is
unavailable. Shared secondary buttons/close controls use the current type, 44px
targets, Medicine Wheel tokens and a consistent focus/pressed treatment. Book and
NFL selected-tab rails use the common accent. NFL remains inside Clubhouse with
the shared bottom navigation available.

Broadcast news, metrics, rivalry series and results have distinct compositions:
full-width news, true split metric/value columns, visible Series context and a
quiet winner accent. Existing daily/champion/Chip Eater imagery, destinations,
swipes and autoplay stay intact. Daily league-wide banter includes three refreshed
DFL-specific sayings. Standard sheets use a shorter travel with a 240ms entrance,
200ms exit and 180ms snap-back; connected player portrait choreography and reduced
motion remain intact. No font, artwork, dependencies or backend changes added.

Evidence under /workspace/dfl-premium-1572/: actual-last/ compiled public-league
reads in both themes at 390px; large-last/ at 320px/200% text; board-last/ offer
cards/menus/editor/compare/three-team routing; connected-final/ Pass/Undo/Keep/Save;
book/ claim/slip/market controls; sheets/ drag/keyboard/motion; home/ broadcast and
nfl/ inline navigation. Screenshots inspected. Provider mutations were blocked or
mocked, including the Sportsbook review wallet. No league/account writes.

Validation: pnpm check passes 2,547 tests in 307 files, release/theme/type/name
checks and the application build. The 124-check offer-board and 116-check connected suites pass. Relevant browser
suites cover offer actions,
player swaps, destinations, focus return, enlarged text, phone edges, contrast,
rapid interactions, cleanup and motion-off. Broadcast passes 90 standard and 56
enlarged-text layouts, one-pass autoplay and manual replay. Final theme/build
checks pass after the enlarged-text refinement. The 88-module bundle retains
three startup/four Home modules and one shared stylesheet request. Physical-device
frame pacing and screen-reader speech remain unmeasured.

# NFL Live with app navigation — 1.571.0

The current user preference supersedes the earlier full-screen presentation. NFL
Live is now an inline Clubhouse section: the shared top bar, bottom navigation
and Clubhouse section tabs stay available. No portal, background inerting or body
scroll lock is used. The dedicated full-screen exit is absent from this surface.

Matchups, Clips and NFL Live switch in place and retain the Clubhouse controller.
Entering NFL aligns its section navigation; leaving a scrolled NFL feed starts the
next section at the top. Week selection, direct NFL/play/video links, game swipes,
Live/Stats, player cards and scoring data remain on the existing controllers.

The Clubhouse section tabs, NFL game rail and Live/Stats pin below the shared
header in a measured stack. The generic compact context dock yields to NFL's
controls, avoiding an extra header. The redundant NFL heading is screen-reader
only; the league recap action stays on the other Clubhouse sections. All control
surfaces use the current Medicine Wheel tokens and existing Inter/NFL imagery.

Evidence: /workspace/dfl-scores-1571/actual-verified/, large-verified/ and landscape/.
Compiled real-data checks pass in Light/Dark at 390×844, 320×844 with 200% text,
and 844×390. They verify usable Home navigation from a scrolled feed, inline slot
ownership, same-node section switching, nonoverlapping pinned controls, contrast,
no horizontal overflow and fresh direct NFL entry. Screenshots were inspected.
The 353-check Clubhouse and 242-check standalone desk suites pass. pnpm check
passes 2,547 tests / 307 files plus release/theme/type/name/build checks. The final
section-scroll adjustment and compiled build pass the actual-final/ real-data
checks in both themes, including starting the next section at scroll position 0.
Final compiled screenshots were inspected before merging.

The 88-module build retains three startup/four Home modules and one shared CSS
request. Lazy NFL data, paused hidden-tab polling, projection caches and finite
field motion remain. Physical-device frame pacing and screen-reader speech
remain unmeasured.

# Full-screen NFL return — 1.570.0

The full-screen Live/Stats view stays intact. Its previously icon-only Back control
is now a visible **Clubhouse** button. It replaces the viewer URL with the same
season/week's Matchups view, including when opened from Home or a fresh direct
NFL link. Generic history Back could previously return to Home instead.

The return control stays pinned while scrolling, including short landscape screens.
It keeps a 44px target, shared theme tokens and a readable label. Enlarged text
moves game browsing to its own toolbar row; a cleaned-up ResizeObserver keeps the
pinned tab offset synchronized without adding data reads. The observer disconnects
when the viewer closes. Existing app chrome returns after route cleanup.

Evidence: /workspace/dfl-scores-1570/. All 242 mobile Scores and 349 Clubhouse
checks pass, plus pnpm check (2,547 tests / 307 files, release, theme, type, name
and production-build checks). The build retains three startup/four Home modules.
Compiled real-data checks pass in Light/Dark at 390×844 and 844×390: normal
Clubhouse entry, scrolled Home-to-NFL entry and a fresh direct NFL URL all return
to Matchups with the same season/week, restored navigation and no full-screen
scroll lock. Screenshots in actual-verified/ and landscape/ were inspected before
merging. Physical-device frame pacing and screen-reader speech remain unmeasured.

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
