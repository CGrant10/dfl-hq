# Clubhouse Stadium Duel — 1.545.0

final result: passed

## Source, viewport and state

The source is the user's **second displayed option, Stadium Duel**, revised to
put the active profile's matchup first:
`/workspace/generated_images/exec-e91b9784-432a-4698-ab2a-a9e3ce5eea0a.png`.
The original selected option is
`/workspace/generated_images/exec-0830108c-e691-46c3-8101-49d183a4f2b3.png`;
`/workspace/dfl-clubhouse-visual-directions/display-order.json` records the actual
presentation order. This is an implementation of that selection in the existing
production app, preserving live league behavior.

The revised source is 852 × 1846 pixels. It was downsampled to 390 × 844 for the
390 × 844 CSS viewport, deviceScaleFactor 1. The under-0.2% aspect difference is
normalization, not a measured layout issue. Both compared images show Clubhouse,
Medicine Wheel Dark, upcoming 2026 Week 9, Thursday November 5 in America/Chicago,
the same selected profile/matchup and actual 0.00 scores. The live roster includes
an actual injury flag absent from the mock, and current other-team photos differ
from the illustrative rail. Actual data and member photo preferences win.

## Rendered evidence

Browser-rendered compiled app, read-only league data:

- `/workspace/dfl-clubhouse-1545/final/clubhouse-dark.png`
- `/workspace/dfl-clubhouse-1545/final/clubhouse-light.png`
- `/workspace/dfl-clubhouse-1545/final/checks.json`

The source and implementation were combined in the **same image inputs** and
inspected at full size and in these focused crops:

- `/workspace/dfl-clubhouse-1545/qa/final-full.png`
- `/workspace/dfl-clubhouse-1545/qa/final-header.png`
- `/workspace/dfl-clubhouse-1545/qa/final-duel.png`
- `/workspace/dfl-clubhouse-1545/qa/final-lineup.png`

Narrow, enlarged and alternate-state evidence is under
`/workspace/dfl-clubhouse-1545/layout-release/`, `/entry/`, `/full/`, `/swipe/`,
and `/route-motion/`. These screenshots remain local, outside public source
control. Workspace Chromium/Playwright was used. A cloud Browser connector,
physical iOS Safari/VoiceOver and device FPS/battery measurements were not used.

## Findings and iteration history

- **Resolved P1: narrow scores collided.** The first 320px capture squeezed
  three-digit totals beside portraits. A container-based alternate composition
  puts portraits and totals on separate rows; wider scores use bounded type.
  Evidence: `entry/320-light-clubhouse-default.png`, followed by the release layout
  matrix and separation assertions. Game IDs/scores are unchanged.
- **Resolved P2: the first implementation was vertically too loose.** Compared
  `qa/comparison-first.png` with the source, then reduced header metadata gaps,
  rail padding and hero/tab spacing. Portraits now match the intended emphasis.
  The final lineup heading aligns within a few pixels of the source; the fourth
  actual player pair begins above navigation instead of reserving blank space.
- **Resolved P2: live styling retained the old dot shape.** The legacy live-status
  pseudo-element made a black oval beside the new state label. The stadium
  separator resets its height, margin, background and radius. Live/final state
  labels still derive from actual player/game status.
- **Resolved P2: the stadium wash was too faint.** Increased the raster's coverage
  and Dark opacity, retaining transparent edges and a lower Light opacity.
  Compare `qa/comparison-first.png` with `qa/final-duel.png`.
- **Resolved P2: position and player words broke awkwardly.** The initial compact
  column split RB2 and McCaffrey. Added a shared position track and bounded the
  kickoff/score column so metadata cannot consume the player's identity width.
  Full names and injury badges now fit or wrap naturally. Final evidence:
  `qa/final-lineup.png`, with responsive containment/separation checks.
- **Resolved functional issue: own game appeared in the middle.** Stable profile
  ordering moves only the active profile's matchup to the start. Default opening
  prefers that game over a saved choice, while explicit links remain exact.
  Entry checks change profiles across both sides and different games and verify
  first tile, selected body, selected scoreboard and initial rail position.

No actionable P0/P1/P2 findings remain in the compared states.

## Required fidelity surfaces

- **Typography:** the existing freely available Inter UI family matches the
  reference's clean boxy type. The hierarchy uses 24px title, 30px normal totals,
  16px lineup heading, 13px player/team names and quieter 10–11px metadata at the
  default setting. Full names remain available; text can enlarge to 200%.
  The real layout can keep short names on one line where the mock wraps them.
- **Spacing/layout:** same masthead, title/week tools, matchup rail, large identity
  stage, six tabs and mirrored lineups. Flags expand in normal flow. Default
  phone composition and 320–768px layouts retain complete controls and no page
  overflow. Native app header/navigation remain unchanged from the accepted
  Sports Desk standard rather than being rebuilt from the generated image.
- **Color/tokens:** shared Medicine Wheel Light/Dark foreground, surface, border,
  accent and semantic tokens. Selected markers use each mode's existing accent;
  minor marker hue/thickness differences from the illustration are intentional.
  No redundant Medicine Wheel options or retired crest colors were added.
- **Images:** existing round DFL brand, real Sleeper/DFL-preference member photos
  and real NFL player portraits. No new mascot/shield/avatar substitutions. The
  only new artwork is a generated transparent yellow/red stadium wash, optimized
  to a 60KB WebP with soft edges. Standard icons are the existing app assets.
- **Copy/content:** date, week, teams, scores, remaining players, weekly stats,
  averages and flags use the actual app models. Upcoming/live/final and unavailable
  states remain honest. No illustrative numbers or explanatory filler was added.

## Verification

- `pnpm check`: release/theme checks, TypeScript, unresolved names, **2,450 tests
  across 296 files**, and a production build pass. Offline module coverage passes.
  The app remains at 3 startup / 4 Home modules, 88 total lazy application modules.
- Entry fixture: **44 checks**, including profile changes, stale saved choices,
  leftmost rail position, explicit destinations and no league writes.
- Full Clubhouse fixture: **329 checks**, including live data/status, tabs,
  player cards, exact clip/notification/roster links, playback close/return,
  lineup/leader fire and ice, refresh, final receipts, contrast and cleanup.
- Six-matchup gesture fixture: **156 checks**, including connected scoreboard
  and lineup finger-following, neighbor previews, reverse/cancel/edge/interrupt,
  native vertical movement, exact route/selection, keyboard and Reduced Motion.
- Responsive fixture: **380 checks** at 320/375/390/430/768px, Light/Dark,
  Compact/Comfortable and 100/125/200% text across all six section tabs.
- Home-to-Clubhouse native route motion: **9 checks**, including roster-based
  mapping across opposite team columns and Reduced Motion/app motion-off cleanup.
- Actual compiled Light/Dark screenshots report no page errors or overflow.

## Follow-up polish / limits

Small generated-image antialiasing and illustration texture differences are P3.
Actual live data, existing shared chrome and complete roster rows are intentional
production differences. No claim is made about untested physical device FPS,
VoiceOver or Safari behavior. The previous Home review is preserved in
[docs/design-qa-home-1541.md](docs/design-qa-home-1541.md).
