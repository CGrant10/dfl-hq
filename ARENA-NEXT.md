# DFL HQ ARENA — handoff

Arena is **paused, not abandoned**. The presentation/flow pass shipped in
v1.102.0 / v1.102.1 and is verified; character customization (`CHARACTERS.md`
phases 2–6) is the next Arena project whenever it comes back up.

Everything below is the state Arena was left in. Do not redo any of it — read
the v1.102.0 and v1.102.1 commit messages for the full detail.

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
