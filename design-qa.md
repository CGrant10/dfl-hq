# Soft Halo loading — 1.597.0

final result: passed

Selected target: the FIRST displayed image in the latest three-option set,
`/workspace/generated_images/exec-65b8342a-0dbf-4df4-b7f2-8a27be89f72c.png`.
It specifies the original round mark, visible neutral halo, black surface, DFL HQ
wordmark and theme-colored activity bar. The user explicitly retained a bar
matching the selected theme and rejected stadium lighting. That calmer background
also replaces stadium lighting on updates; the shield/Update action stay there.

Evidence: `/workspace/dfl-halo-1597/`. `selected-final-comparison.png` shows the
source and revised browser rendering together at 390×844 CSS/pixels, density 1.
The 852×1846 source is downsampled/cropped by about one pixel for normalization.
Full views clearly expose logo, halo, wordmark and bar; no additional focused crop
is needed. `halo/` contains 320/390/768px Dark/Light and a Seattle palette capture.
`final/` covers update idle, focus, pending and motion settings. `actual/` checks
real current-member startup/Home/navigation with provider writes blocked.

Required fidelity surfaces:
- Typography/copy: existing self-hosted Rajdhani/Inter; original round mark and
  readable DFL HQ wordmark. Season/tagline omitted from ordinary HQ opening as in
  the selected target. The update keeps its headline, anniversary and clear
  Update action. Busy copy is the functional UPDATING status, without new prose.
- Layout: logo ~224px at 390px, compact 184px×3px activity line, centered grouping
  and existing fast ready fade. Source/implementation optical type spacing differs
  by a few pixels (P3); both remain crisp, balanced and unclipped. Compact and
  landscape update actions remain accessible and no horizontal overflow occurs.
- Color: truly black brand plate under both Medicine Wheel defaults, neutral
  soft light, original monochrome logo. The bar uses --accent-sweep rather than
  fixed theme colors. A validated mode-specific accent cache restores first-paint
  colors; normal theme initialization stays authoritative. Pinned route palettes
  cannot overwrite that cache. Invalid/stale cache data safely falls back.
- Assets: supplied logo/shield remain unmodified. A generated neutral halo asset
  is shared by both screens: `assets/loading-soft-halo.webp`, 512×512, 2,798 bytes,
  pure-black edges. It replaces the 124,598-byte opening stadium download/cache.
  The original generated halo is retained outside the repository. No custom crest,
  rasterized UI, new font or extra startup module. Stadium DOM, masks, timing and
  preload are removed from these screens. Other page artwork is untouched.
- Motion: brief opacity entrance and theme-line movement; motion preferences and
  tab visibility are honored. No bank sequence or animated blur/filter. A slow
  halo download never holds readiness. Existing 120/260ms minimums, 1.2s fallback,
  1.5s hard safety and quick fade remain. Update markers stay backward-compatible;
  readiness is still announced only after first-route paint.

QA iteration:
- P2: placing the opaque-black halo inside individual logo stacking contexts
  obscured the following wordmark/update headline. Moved it behind each complete
  foreground group: the normal lockup's background and the update root background.
  Revised captures show every word and anniversary intact.
- P2: the first halo crop was weaker than the selected mock. Expanded the opening
  image footprint while keeping the logo geometry and black edges. The final
  combined comparison shows a visible, smoothly feathered neutral light.
- Existing source-contract and worker tests were updated to enforce removal of
  retired stadium requests and cache the small halo once. Theme tests verify
  cached accents, mode validation and route-pin isolation.

Validation: 2,628 tests / 313 files pass. Release coherence, theme guard,
TypeScript, identifier checks and production build/bundle verification pass
(89 modules; startup 3, Home 4). Eleven opening browser cases pass: 320/390/768
Light/Dark, selected NFL colors, motion off, Reduced Motion, short launch and a
2.5s-delayed image. Update contrast, focus, motion and compact/landscape checks
and preview-to-Home navigation pass. Real startup confirms one round mark, no
shield/stadium banks and a plain black surface. No account, league, roster,
notification or wager was mutated. Public verification follows merge.

No unresolved P0/P1/P2 findings. P3: static source and live activity-line position
vary by animation phase; small optical typography differences retain existing
app fonts. Physical iOS pacing, screen-reader speech and native offline install
are not measured. Cache behavior is unit tested. Implementation checklist:
selected target, asset placement, first-paint theme matching, fast lifecycle,
preferences, responsive/contrast/browser review and checks complete.


# Analyzer production and Clubhouse kickoff alignment — 1.598.0

Reported issue reproduced in the compiled app using the connected league:
Matthew Golden's Trends row said “Not enough history” while the shared player
pool held 179.9 points across 10 games (17.99 PPR/game), with recent form rising.
Only his completed 2025 season appeared in that row. The history panel also
cached its first roster/scoring-specific result across subsequent teams.

Current-season production now joins the prior-season record without another
large stats request. Raw prior-season maps are cached by season for five minutes;
roster histories and league scoring are recomputed for each report. First-season
players display real games/points rather than a generic insufficient-history
warning. One/two-game samples are identified without declaring an annual trend;
partial live games use completed weekly samples. Zero scoring remains distinct
from missing data. Unplayed current-season weeks do not count as absences.
Annual slope uses actual year spacing when seasons are missing.

Grading audit: the shared model already included current PPR scoring, recent
production/consistency, projections, usage, injuries/availability and usable
FantasyPros ranks. Value prices the point gap above position/flex replacement,
with the existing ordinary-QB discount for one-QB leagues. Team grades compare
league starting units (72%), depth (18%) and roster asset value (10%); the five
starting-unit percentiles have equal weight. No evidence justified changing
those weights for this display bug. Golden's model/trade value is unchanged.

Mobile Clubhouse kickoff labels inherited grid justify-items:end. The left
labels now anchor to the player column's left edge, and right labels explicitly
retain their right edge. Real 320/390px Light/Dark captures verify both edges
within one pixel, no horizontal overflow and no page errors. Player scores,
matchups and animation behavior are unchanged. Narrow-screen trend labels also
remain on one line instead of shrinking into split words.

Evidence: /workspace/dfl-analyzer-1598/{trends-before,after,final,public}; provider
writes blocked. Golden's compiled after row reads “Rising”, “2025 5.0 · 2026 18.0
per game”, and “10 games · 179.9 pts”. Regression tests cover roster/scoring and
season changes, first-season production, live samples, real zeroes and year gaps.
Full suite: 2,636 tests / 314 files pass. Required theme, release, identifier,
TypeScript and production bundle checks pass. Physical-device/screen-reader
behavior is not newly measured; server-side ingestion was not changed.


# Trade matching, counters and roster insurance — 1.599.0

The default Fair search now favors balanced, useful roster changes with no
material participant harm after roster costs. Explicit team/player/position
searches retain their wider negotiation space and display their actual risks.
Automatic balancing also revisits price-balanced offers with poor roster fit,
then re-evaluates every adjusted package. Packages dominated by unused incoming
names are filtered sooner; the eight-player ceiling and explicit exclusions stay.

Verified NFL RB1/RB2 relationships add roster-specific insurance value without
inflating a player's shared market price. Losing an owned starter's backup,
especially behind an injured/questionable starter, lowers recommendation quality;
losing the last useful position reserve also costs more than expendable depth.
RB depth receives more protection than WR/TE depth. Acquiring an owned RB's
verified backup is useful depth. Trading both backs together is not an insurance
loss. No relationship is guessed from names, ambiguous charts, another NFL team,
third-string status, or a season-ending starter. A handcuff-for-bench-TE swap
cannot earn a helpful Fair counter merely through generic bench points: losing
RB insurance requires meaningful starter improvement or replacement coverage.
Projected points remain separate from these qualitative roster preferences.

Small Sleeper facts (143 RB roles, ~4.7KB) refresh every six hours through a
bounded GitHub workflow. The app reads current published/shipped facts in parallel,
shares/caches requests, and excludes stale (>36 hours), malformed or mismatched
roles. Failed final verification cannot certify a cached role source as fresh.
Relevant unavailable RB-role evidence remains visible and blocks a Steal claim.
No paid feed, raw multi-megabyte player download on the phone, database migration,
or mutation of league rosters is introduced. Role facts/modules are precached.

Offer price labels are Balanced / Favors you / You're overpaying, with data
quality separate. Required drops also produce a net balance; a quoted balanced
package can lose its Fair recommendation after cuts. The old blanket “50% expert
weight” copy is corrected to reflect the existing coverage/agreement-based blend.
Player prices, 1QB discount and the existing QB Steal restriction are retained.

Counters present distinct closest-fair, best-improvement and keep-core options;
when no improvement exists, the label says Best available fit. Locked players,
position filters, exclusions, routing and current ownership remain enforced.
The bounded yielding beam retains requested targets as well as smaller repairs,
and continues past flat lateral swaps to seek a useful counter. Main-piece
changes are explicit. Closest packages are not relabeled fair, duplicates are
removed, and an impossible legal alternative offers target editing or a three-team
builder. Latest roster/coverage changes trigger re-review before sharing.

Read-only connected-league verification recognizes Emmett Johnson behind Kenneth
Walker in KC on roster 9, including Walker's current risk status. Removing Johnson
costs coverage while Walker remains. A four-player, all-team default search returns
60 Fair offers at the requested cap; sample trades improve both lineups. The
expensive search remains in the existing worker; counter search yields and cancels
when the draft changes. Startup remains three modules; Home remains four.

Evidence: /workspace/dfl-trade-1599/{browser,browser-large,actual-final,public}.
320/390px Medicine Wheel Light/Dark browser checks exercise named coverage,
full regrading of every Fair counter, distinct packages, current routing,
single-line names and no horizontal overflow/page errors. Additional enlarged
text captures use 32px root type. Existing motion and focus handlers are retained.
No account, notification, roster, transaction or wager was changed by browser QA.
Two Python refresh tests and all 2,654 JS tests / 318 files pass; release/theme/type/name
and production bundle checks pass. Native device pacing and screen-reader speech
remain unmeasured. Role schedules are configured, not a promise of instantaneous
NFL depth-chart changes or guaranteed manager acceptance.


# Roster-aware Next Move and waivers — 1.600.0

Waiver planning and Home's final Next Move now share retention/usefulness checks.
Verified owned RB handcuffs stay protected even when their current projection is
small or their starter is on IR. Known future bye coverage and the last useful
RB/WR reserve cannot be spent on an unrelated pickup. Same-position additions
remain possible when they preserve coverage across the available forecast weeks.
Ordinary QB/TE reserves remain expendable unless an absence or risky starter makes
them needed cover. Existing injury-return/high-value protections remain, while
explicitly season-ending players can be replaced. Missing RB-role data produces
an unverified-role hold rather than an invented handcuff relationship.

Small single-week gains no longer trigger routine churn. The planner accepts a
real slot gap, a meaningful current/future starter upgrade, or sustained useful
multiweek improvement, with a larger threshold for ordinary QB pickups. A points
increase cannot justify leaving fewer legal starting slots filled. Home rechecks
cached pickup/drop advice against the current owned roster and retention facts;
its skill-player recommendation uses the same usefulness rule. Named holds give
one clear action and reason. Home's trade radar also avoids advertising another
owner's handcuff as ordinary spare depth, including a starter held on IR.

The coach rechecks existing small backfield facts independently of a Home visit's
original analyzer snapshot and requires the latest NFL team to match. No new
provider, paid service, backend schema or league/account write. The new pure
retention module is included in offline dependencies. Startup remains three
modules and Home four; app production bundle checks pass.

The waiver panel leads with its primary Add/Drop or named hold, then market data.
Names stay on one line; other pickups and league detail remain expandable. Long
drop-team attribution moves into the expanded detail. Boilerplate footer text is
replaced by the check time and forecast window. Refresh and disclosure controls
use readable shared Medicine Wheel inks after visual review found a faint old
accent in Light mode. Existing refresh focus, individual disclosure state, FAAB
limits and failure/retry behavior remain.

Evidence: /workspace/dfl-roster-1600/{fixture,actual,public}. The existing browser
runner passes priority/FAAB, partial history, recent-drop details, refresh focus,
independent disclosures, failure/retry and enlarged text at 320/390/768px. Eight
additional cases apply real Medicine Wheel tokens at 320/390px in Light/Dark and
16/32px root text: compact Add/Drop, named Walker/Johnson hold, one-line names,
contrast and no horizontal overflow/page errors. Actual current-league Home and
Clubhouse captures in both themes are read-only. Roster 9's current waiver plan
retains Emmett Johnson as Kenneth Walker's handcuff and offers no unsafe drop.

Validation: 2,663 tests / 319 files pass, plus 31 focused checks after final copy
and ownership refinements. Release coherence, theme guard, TypeScript, identifiers
and production bundles pass. No native phone pacing or screen-reader speech is
newly measured; forecast coverage remains limited to available source weeks.
