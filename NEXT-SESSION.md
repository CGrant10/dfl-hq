# DFL HQ ARENA — NEXT SESSION: CHARACTER CUSTOMIZATION

The presentation/flow pass (v1.102.0) is done and verified. **Character
customization is the next project** — see `CHARACTERS.md`, phases 2–6.

---

## Done in v1.102.0 — do not redo

### 1. Entering the Race View no longer starts the race

`#bc-start` on the event page (`js/pages/arena.js`) used to write `seed`,
`bc_state: running` and `bc_started_at = now + 2700ms` and *then* navigate, so
the shared countdown was already running while the Race View was loading. It
now **writes nothing** and only navigates. Its label is "Go to Race View"
("Go to the live race" when one is already running).

`#bc-go` inside the Race View (`js/pages/broadcast.js`) is the **only**
control that starts a race. It writes a **new seed**, `bc_state: running`,
`bc_started_at = now + COUNTDOWN_MS`, `bc_offset_ms: 0`.

Same-seed **Replay** stays on the event page and still writes the clock with
the stored seed — deliberately untouched, it is the one same-seed flow.

`write()` in `wireBar` now hands the patch straight to `apply()` via
`live.apply`, so the commissioner's own screen reacts to its own button
instead of waiting for realtime or the 1s poll. Measured: countdown drawn at
"3" **55ms** after the press.

`data-race-state` on `.bc-stage` is `idle | countdown | running | paused |
finished`. The idle view keeps the control bar legible (`BAR_STANDBY_MS`
7000 rather than 2600) and still auto-hides, so an OBS source settles to a
clean starting grid.

### 2. The finish line arrives before anyone crosses it

**This was geometry, not overlay timing.** `finishPassProgress()` was a
right-to-left *pass* over `first - 1500 → last + 900`, so its midpoint — the
only moment the stripe is over the crossing point — landed **1.6s to 5.0s
after the winner had already finished**. Measured at the winner's crossing,
the stripe was at **108%–131% of the frame**: offscreen right. Racers crossed
nothing, and the photo-finish result panel appeared while it was still out
there.

Replaced by **`finishArrival(elapsedMs, firstFinishMs)`**: an eased, clamped
ramp that brings the structure in from offscreen right and **stops on
`FINISH_LINE_RATIO` 420ms before the first official finish**
(`FINISH_SETTLED_LEAD_MS`). `lastFinishMs` is no longer an input. CSS
variable renamed `--finish-pass` → `--finish-arrival` (1 = on the line) so a
stale consumer cannot silently read a differently-scaled value.

Measured — stripe left edge, % of track (v1.102.1, `PRE_FINISH_SWEEP_MS`
1100):

| relative to the winner's crossing | stripe |
|---|---|
| −1100ms | 113% (offscreen) |
| −1040ms | enters the frame |
| −900ms | 77% |
| −700ms | 62% |
| −420ms onward | 58% (on the line) |
| last finish + 320ms | fades out (CSS, `data-race-state="finished"`) |

**2600 was tried first and was too long.** It put the structure in frame 2.4s
before the winner, and with a spread of 3.9s–10.7s it then stood in the middle
of the shot for six to thirteen seconds while the tail streamed through. It
cannot go below about a second: with a static ground, progress 1.0 maps to
`FINISH_LINE_RATIO` for **every** racer, so the line has to be standing there
while the field comes through, and how long that takes is the finish spread.
A line that sweeps past instead is a line whose position disagrees with
somebody's official crossing. Making the finish a genuinely ~2s event needs
the spread work below, or a scrolling-track camera (racers held mid-frame,
ground panning) — which would make racer screen x time-dependent and retire
the camera-independence spec.

`FinishPresentation` gained **`crossingShown` / `crossingShownMs`** — the one
answer to "may the UI say who won yet". The decisive crossing is P2's line in
a photo finish and the winner's own otherwise. `celebrationActive` is gated on
it, and the photo-finish **result** phase now waits for
`crossingShownMs + RESULT_BEAT_MS` (220ms) instead of P2 + 120ms. The
`approach` phase ("PHOTO FINISH", tension only) is unchanged and still runs
before the line.

Verified over 6 real close finishes: approach ≈ −0.76s, flash at the
crossing, result +220ms, stripe on the line throughout. Winner card and
`is-winner` appear at `last + 320ms` and never earlier.

### 3. The course, instead of a skybox

`.race-scenery` **moved inside `.bc-track`** in `paint()`. It used to be a
sibling of the header and footer, so its percentages measured the window
while the lanes measured the track — the horizon landed mid-field, the top
lanes ran through the sky and the crowd sat under the bottom lane's feet.

New bands (`css/broadcast.css`, scoped `.bc-stage.cinematic-race` — three
classes, so it wins over `screens.css`'s two-class skybox rules regardless of
load order), as % of the track:

```
0    - 11%    sky strip
3    - 13%    distant hills + treeline   (.race-hills.far / .race-hills)
6    - 14%    stand + crowd              (.race-stands / .race-crowd)
12.5 - 16.5%  DFL banners                (.race-banners)
15.9 - 17%    far fence                  (.race-rail)
16.5 - 100%   THE COURSE                 (.race-course)
98   - 100%   near verge                 (.race-verge)
```

`LANE_BAND_TOP` 0.18 / `LANE_BAND_BOTTOM` 0.92 in `src/arena/viewport.ts` are
the single definition of the running surface; `js/arena/racer-view.js` imports
them for the DOM lanes. **Shifted, not squeezed** — pitch only 6.67% → 6.17%.
0.94 was tried first and clipped the bottom lane's feet on a 294px landscape
track (feet at 100.2%); `viewport.spec.ts` now measures against the four real
track boxes rather than window sizes.

Also: `.bc-finish` and the new `.race-start-gate` span the running surface
(14.5%–98.5%) instead of the whole frame, the stripe gained a gantry cap, and
`.bc-body` is full-bleed.

### Verified

1920x1080, 1280x720, 844x390 landscape, 254x687 portrait: every lane's feet
between the course top and the bottom edge, no console errors, reduced motion
toggles clean. Mid-race join lands at the shared elapsed position and does not
touch the row. typecheck clean, **100 tests**, build clean.

---

## Architecture that must be preserved

```
simulate()            authoritative truth — never touched
theatre.ts            dramatize / planArcs / allowance / closingEase
finishTrajectories()  precomputed per racer
presentFinish()       owns displayProgress / exiting / speed / phase
presentationScreenRatio()  ONE straight line, camera-independent (spec)
finishArrival()       scenery only, time-derived, monotonic, stops on the line
crossingShown         the ONLY gate on any result graphic
LANE_BAND_TOP/BOTTOM  the course band, read by Pixi and the DOM alike
composeCharacter()    single character source of truth
#bc-go                the only writer of a race start
```

Geometry: `TRACK_START` 0.04, `FINISH_LINE_RATIO` 0.58, `MAX_SETTLE` 0.34,
course top 0.165, lane band 0.18–0.92.

---

## Still open

### The huddle — convergence fixed, spread metric unmoved

`closingEase` takes **milliseconds to that racer's own finishMs**
(`CLOSE_MS = 900`) instead of a shared `CLOSE_FROM = 0.88` progress mark. It
did **not** move the first-crossing spread: seed 1000 still 0.129, seed 90210
still 0.103.

Why: at the first crossing the metric is dominated by two things that are not
the closing envelope — leaders pinned near 1.0 by the `ahead` allowance, and
trailing racers drawn *forward* of their truth by their arcs (seed 1000:
trailing truth 0.817, drawn ~0.871). The field compresses because the back is
pushed **up**, not because the front is pulled back.

The lever is **arc composition** — trailing racers wanting negative deviation
late — which is the race-shape/disparity work. Do that pass and re-measure;
do not tune `CLOSE_MS` expecting the spread number to move.

| | seed 1000 | seed 90210 |
|---|---|---|
| drawn spread mid-race | 0.546 | 0.185 |
| drawn spread at first crossing | **0.129** | 0.103 |
| TRUTH spread at first crossing | 0.183 | 0.112 |

Constraint: drawn must still meet truth at each racer's official crossing.
`theatre.spec.ts` enforces no-early-crossing, bounded backslide, determinism
and smoothness.

### Deferred

1. `src/arena/engine.ts` dead while `ARENA_MIGRATION.md` says "Complete"
2. `--font-condensed` undefined; `.pet-option-label` still reaches for it
3. Two CSS namespaces (`.runner*` / `.bc-*`); the legacy
   `.arena-track-wrap` race rules in `screens.css` are dead — the event page
   has not drawn a race since the shared-viewer change
4. `.bc-stage .bc-body{display:block}` and `.bc-board{position:absolute}` in
   the "Open-field race view" block never take effect — the board still
   occupies a 20vw grid column instead of floating over the course. Pre-dates
   this pass; fixing it would widen the course by ~20%
5. `pet-texture.ts` `normalizePet` vs `normalizeCharacter`
6. Editing `src/arena/*.ts` requires `pnpm build`
7. **Character customization — Phases 2–6, `CHARACTERS.md`. This is next.**
8. Race disparity / race shapes — after the huddle fix
