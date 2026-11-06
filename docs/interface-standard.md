# DFL interface standard

First adoption: Home and Clubhouse in 1.524.0. Source owners are
`css/tokens.css` and `css/interface-system.css`; the combined stylesheet remains
one request. Existing feature-specific art and motion keep their own ownership.

League Wire in 1.529.0 coordinates the four daily pages through
`css/league-wire.css`, appended after the component sheets. Home, Clubhouse,
Trades, Book and More are the five primary destinations. Team Analyzer belongs
in Clubhouse's Week & tools and More. The shared header uses the supplied round
DFL mark; the shield remains reserved for the icon/update screen.

The user-selected Sports Desk composition (Home 1.541.0, Clubhouse 1.543.0, roster/archive tools 1.544.0)
is owned by `css/home-sports-desk.css` and `css/clubhouse-sports-desk.css` after
the shared component sheets. Preserve this direction when extending other pages.

Home's fixed reading order is active trade coverage directly below the shared
header, date/matchup, wide broadcast, rankings, highlights, weekly tools,
league/archive content and the Wall last.
Phase updates must not shuffle that composition. Real clip thumbnails and
headlines supply the media content; loading reserves geometry and never mounts
video on first paint. Browse retains the full reel and its filters. Keep real
long names and current data readable rather than freezing reference copy.

Clubhouse puts the native week/tools control beside its title, expanding into
normal flow below it. Narrow/enlarged layouts can stack that control. One
profile-first matchup rail and selected-game scoreboard sit above the six
section tabs. Matchups then leads with opposing player rows and supporting
panels. Keep names, weekly stat lines, PPR averages,
44px targets, semantic phases and hot/cold effects. Late chip-size changes may
reveal the selected matchup; deliberate rail browsing must retain its position.

Trade keeps its active goal, teams, package limits and Fair/Aggressive/Steal
counts visible. Goal shortcuts belong inside Edit search, retaining native
controls and reversible disclosure behavior. Team Analyzer aligns corresponding
start/sit fields across both players, with complete names and intrinsic heights.
Archive leads with the existing champions; photo submission follows the trophy
case. Keep the compact title/action row and the year hierarchy.

The shared phone navigation uses 56px buttons, 22px icons and 11px labels at the
default text size (1.542.0). Native safe-area space is additional; enlarged text
can wrap. Desktop keeps 48px buttons. Keep the existing moving active marker.

Occasional controls use a visible native disclosure: Clubhouse Week & tools
and Trade Edit search. Keep the current search visible while closed and use the
shared reversible expansion. Book keeps its balance in the masthead and its
Claim SIN action in normal page flow, clear of the board tabs. Preserve 44px
targets, pending/retry feedback and motion preferences.

Trade and Sportsbook adopt the row, metadata and numeric roles in 1.527.0.
Trade offer portraits retain their framing, with 28px width on narrow phones
and 32px otherwise. Sportsbook props use 13px names, 11px metadata and 18px
sports figures; names retain a 44px tap target. Slip fields reflow at larger text.
Retained offers keep their actual DOM and portraits across result batches;
only new visible cards enter. Changed quotes show exact values immediately.

Rankings, member profiles and the season archive adopt these roles in 1.528.0.
Broadcast briefs use Inter headlines/identities and Rajdhani figures; the daily
opener retains its own art direction. Ranking reports follow the visible
viewport and keep their header available while scrolling. Profile/archive
native fields use the shared 16px input role.

## Type roles

The 1.530.0 competition pass puts Clubhouse lineups before supporting panels.
The chosen matchup has one compact identity/score block; the global scroll
reference carries that context after it leaves. League scores expand in place.
Book uses one Board/My bets/Pick'em navigator with market filters scoped inside
Board. Trade tickets keep complete packages and the value/time line visible;
deeper impact and risk use the shared disclosure motion. Full metrics and risk
details remain available rather than being removed for density.

Page scroll references yield to open detail dialogs, including body portals.
Pending section entrances stop while covered and the current reference returns
after dismissal. Keep this behavior when adding new sheet destinations.

| Role | Compact size | Face / weight | Use |
| --- | --- | --- | --- |
| Page title | 24px | Inter 700 | The DFL Daily, Clubhouse |
| Story headline | 20px | Inter 650 | Briefing lead, featured archive story |
| Section | 16px | Inter 700 | Week ahead, Power rankings, League scoreboard |
| Identity / row | 13px | Inter 600–650 | Team/player names, row headlines |
| Body | 13px | Inter 400–500 | Supporting copy |
| Metadata | 11px | Inter 400–500 | Records, owners, context |
| Short labels | 10px | Inter 500–600 | Week/status captions |
| Text input / select | 16px | Inter 600 | Native picker text; mobile focus stays usable |
| Scores | Existing stat scale | Rajdhani 700, tabular | Matchup totals, player scores, ratings |
| Broadcast briefs | Story-specific scale | Inter headlines, Rajdhani figures | Award, news, receipt and score stories |

All sizes are rem-based. Comfortable mode raises row text to 16px, body and
metadata to 14px, labels to 12px, and section headings to 18px. System text scaling
also reflows the layout. Do not squeeze long names into a tiny font to preserve a
single line.

The local variable Inter file already ships and is precached for share graphics.
Its stylesheet declaration and preload now support interface text too. Rajdhani
and Anton remain in their sports/illustration roles. No remote font service.

## Geometry and surfaces

- Use a 4px spacing grid: 4/8/12/16/24. Phone gutter is 16px; row padding is 12px.
- Keep at least 44px interactive height and practical touch widths, with visible
  focus. The type inside a control can stay compact without shrinking its target.
- Use 6px control corners and 8px feature-panel corners. Ordinary list rows are
  transparent with one soft dividing rule; do not put a panel around each field.
- Canvas uses `--bg`; feature panels use `--bg-2`; selection uses a restrained
  accent marker. A full saturated outline is not needed around every selection.
- Names and live values use `--text`; supporting details use `--body-text` or
  `--muted`. NFL/member colors and meaningful status colors retain their meaning.
- Show one clear page context. Avoid a second eyebrow repeating the page's role.
- Preserve exact data and action destinations while changing presentation.

## Shared component families

- `data-ui-tabs`: compact labels, selected text, native keyboard behavior and the
  existing sliding indicator. Home weekly/position views and Clubhouse adopt it.
- `data-ui-picker`: labeled native selectors with the shared text, height,
  surface, border and focus rules. Clubhouse season/week is the first adopter.
- `data-ui-section`: sentence-case section titles using the section token.
- Identity rows share the same UI font/weights and quiet metadata; score columns
  keep tabular sports numerals. Home leader/ranking rows and Clubhouse
  matchup/leader/stat rows establish the examples.
- `data-ui-score-strip`: Home's returning matchup dock and Clubhouse's pinned
  lineup score reference share team-mark, name and tabular-score roles. The
  owning scroll controller still manages Home's flight and return behavior.
- `data-ui-player-row` / `data-ui-player-score`: submitted player rows and Home
  leaders keep the identity separate from its score. Home/league portraits use
  a compact 32×36px frame. Full names wrap; score/status keys keep their meaning.

Clubhouse navigation reflows all six destinations inside its own container.
Normal wider phones use one row; narrower/large-text layouts use two or three
rows. The existing underline follows both horizontal and vertical selection.
Pickers and utility controls also reflow at larger text sizes. Avoid concealing
navigation labels with an overflow clip as a substitute for layout.

Keep the route adapters in `interface-system.css` while migrating old selectors;
new component declarations should use the shared roles instead of choosing a new
size or weight on each screen. Functional changes belong in the owning component,
not in visual CSS.

## Motion and verification

Reuse the existing press, tab-slide, sheet and score transitions. This migration
adds no animation loop or polling. Matchup phase changes in 1.528.0 use a finite
200ms status transition supplied by the existing model. Decorative motion must
respect Motion off and Reduced Motion, and it must leave labels readable.

Before extending this standard, capture the actual production components in both
Medicine Wheel themes at 320px and 390px, then check enlarged/Comfortable text,
keyboard navigation, long names, contrast and selected/pressed states. Check
scores and routes against their source; visual cleanup must not alter either.

See the [1.524 review](interface-foundation-1524.md) for current-run screenshots,
coverage and limits.

See the [1.528 review](league-interface-1528.md) for the league-page and broadcast
adoption, viewport checks and current browser limits.


### Clubhouse Stadium Duel — 1.545.0

Clubhouse follows the selected Stadium Duel reference: title/week/date, native
matchup rail, selected-game identity and exact totals, section tabs, then mirrored
starting lineups. Keep the active profile's game first without renumbering games,
flipping team sides or changing other games' relative order. Normal visits choose
that game ahead of a saved selection. Explicit matchup/roster links remain exact;
guests and profiles without a matchup keep the league order.

The score stage is shared across the Clubhouse sections. Its connected DOM is
also the swipe destination and Home transition target; do not duplicate visible
heroes in each panel. Preserve per-game live score/status bindings, current
photos, profile links, final receipts, scrolling score context and thermal effects.
Horizontal gestures move the selected stage or lineups; vertical movement stays
native, and swiping a profile link must not trigger navigation. Tab indicators
and finite team-logo arrivals honor both app motion and Reduced Motion.

Use the transparent stadium-light WebP for soft yellow/red artwork, with a lower
opacity in Light. Other colors come from shared tokens. Allow narrow/enlarged
layouts to place totals below portraits, wrap complete team/player names, and
expand flags in document flow. Keep position tracks and score columns aligned;
status/kickoff text must not steal the player-name column. No new mascot or
shield artwork belongs in this composition.


### Daily tool adoption — 1.549.0

Book, Trades and More adopt the approved Home/Clubhouse reading hierarchy through
explicit `data-daily-desk` ownership and semantic title, row, number and action
roles in `css/daily-desk.css`. These opt-in roles leave editorial artwork and
sports identities under their existing owners. Continue migrating shared roles
rather than introducing another visual direction.

Book uses aligned team/odds rows, one section divider and quiet price surfaces.
Selected odds retain action-token contrast; the personal matchup keeps its accent
edge in the main board. Trades uses full player names above position/team metadata,
quiet assessment labels and one clear Analyze action. Offer counts, balance,
lineup/risk previews and secondary actions remain available. More uses Inter,
the same paper surface, supplied flat glyphs and 48px rows. Its opaque cover,
finite entrance, focus trap and return behavior remain intact.

Compact text remains small without reducing 44px targets. Comfortable reading
explicitly enlarges player names, metadata and navigation labels; rows can grow.
Preserve reduced-motion and app-motion preferences, reversible disclosures,
exact receipt routes, native scrolling and the existing selection rail.

Home/Clubhouse retain their current composition, and the active trade notice
remains subtle at the top of Home. This pass adds no dashboard modules or
explanatory UI copy. Physical device motion and screen-reader speech still need
on-device review; browser layout checks are not a measured frame-rate claim.

### Unified Clubhouse NFL desk — 1.550.0

Clubhouse's NFL live page uses `combined:true` in the existing game controller.
`js/nfl-game-desk-ui.js` and the combined-layout section of
`css/clubhouse-viewing.css` own the composition: one game score, the field,
side-by-side fantasy stats and the complete latest-first play feed. The clip
browser retains its focused plays/stats controls in the smaller video surface.

Mobile starts with two fantasy players per NFL team. All players expand in
place with reversible height motion; no player names or play descriptions are
line-clamped. Plays/Stats controls jump to sections without hiding content or
pretending to select another view. Their offset uses the measured toolbar height,
including narrow/enlarged layouts. Wide containers place plays and stats beside
each other. Use Inter and the shared type, action, border and paper tokens;
real NFL team colors retain their meaning on the field and play rail.

Preserve exact league/weekly PPR values, unknown-point placeholders, current
player-card links and season/week context. One existing game poll updates both
sections; weekly stats use a bounded 20-second cadence, including failures.
Updates preserve old plays being read and keep the existing new-play return,
filters, game snapshots, video handoff, background/modal pause and teardown.
Back restores the expanded stats; a fresh visit starts compact. Don't add another
poller or duplicate scores above the player lists.

Browser checks cover the combined controller and actual Clubhouse in both
Medicine Wheel modes, narrow and wide screens, 200%/Comfortable text, contrast,
44px targets, native game selection, section jumps, rapid expansion reversal,
Reduced Motion, app motion off, live PPR updates and error recovery. Physical iOS
frame pacing and screen-reader speech still require device review.
