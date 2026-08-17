# DFL HQ ARENA — NEXT SESSION: FINISH PASS-BY FIX

Investigation-only handoff. **No behaviour was changed in the session that
wrote this.** Three defects were traced to root cause and measured.

---

## Current version / commit

- branch **main**, version **1.93.0**, working tree clean, pushed
- deployed: `https://cgrant10.github.io/dfl-hq/`
- toolchain: Node 24 LTS, `corepack pnpm <script>` (bare `pnpm` is not on
  PATH, so the `check` script fails locally — run the three separately)
- **typecheck clean · 88 tests passing (13 files) · build clean**

Relevant commits: `v1.93.0` finish docs + dead coast removed · `v1.92.0`
stripe sweep · `v1.91.0` character compositor · `v1.90.0` run-out geometry ·
`v1.89.0` theatre → TypeScript, backward movement became a feature.

---

## 1. CONFIRMED ROOT CAUSE — finish boomerang

**Yes. Reversible drawn leader progress causes it.** Confirmed structurally
and measured.

Path:

```
shown[i][t]                     drawn position — CAN DECREASE since v1.89.0
  ↓  max over racers, recomputed from scratch every frame, no latch
leaderProgress                  js/pages/arena.js:1018, broadcast.js:474
  ↓
finishReveal(leaderProgress)    smoothstep(REVEAL_FROM 0.868 → REVEAL_FULL 0.92)
  ↓
--finish-reveal                 written to the wrapper
  ↓
transform: translateX((1 - reveal) * 55vw)     screens.css / broadcast.css
```

`leaderProgress` is `Math.max` over `shown` recomputed each frame. Backward
visual movement is an intended feature, so that maximum is **not monotonic**.

Measured over 25 seeded 12-racer races:

| | |
|---|---|
| races where drawn leader moves backwards | **25 / 25** |
| races where the finish stripe reverses | **8 / 25 (32%)** |
| worst single reveal reversal | 0.0732 |
| → stripe travelling back | **~4vw** |

Example, seed 32676, consecutive ticks 219–222 — reveal falls while the
stripe is mid-entrance:

```
lead 0.8771 → 0.8769 → 0.8765 → 0.8757 → 0.8747
reveal 0.080 → 0.078 → 0.071 → 0.059 → 0.045
```

The reversal lands just inside `REVEAL_FROM` (0.868), i.e. the stripe begins
entering, then backs out, then enters again. **That is the boomerang.**

---

## 2. HUDDLE CAUSE — two contributors, one of them the simulation

Measured drawn spread and screen spread at four moments (seed 1000 /
seed 90210):

| moment | drawn spread | screen spread |
|---|---|---|
| mid-race | **0.546** / 0.185 | — |
| 2s before first finish | 0.356 / 0.262 | 0.193 / 0.143 |
| first crossing | **0.129** / 0.103 | **0.069** / 0.056 |
| last crossing | — | 0.064 / 0.062 |
| race end | — | 0.095 / 0.089 |

**(a) The theatre erases itself exactly when the camera is on it.**
`closingEase()` (`CLOSE_FROM = 0.88`) drives the deviation to zero as each
racer approaches the line. Drawn spread collapses from 0.546 mid-race to
0.129 at the first crossing — a **76% collapse** — precisely during the
moment the finish is meant to look dramatic.

**(b) The simulation itself finishes the field tightly.** All twelve cross
within **1348–1521ms**. At a real crossing speed of ~1e-4 progress/ms that
is ~0.14 of progress ≈ 7% of frame *no matter what the presentation does*.
`simulate()`'s drafting term (`want *= 1 + (packMean - frac) * 0.55`) is what
keeps the field together, and it is authoritative — not to be touched.

Note at the first crossing the DRAWN spread (0.129) is *narrower than the
TRUTH spread* (0.183) — the theatre is actively compressing the field below
reality at the line. That is `closingEase` doing its job too well.

**Not the cause:** the progress mapping (linear, `TRACK_SCALE` 0.54, spec-
enforced camera-independent), the finish trajectories (per-racer,
velocity-continuous), a second finish path (none exists — verified by grep),
or live/shared divergence (both call the same functions).

---

## 3. WHITE HORIZONTAL LINES — four global layers

All four are **global track-wide overlays**, none racer-specific.

| # | where | file | trigger |
|---|---|---|---|
| 1 | `.track.is-running::before` / `.bc-track::before` | `css/screens.css:969` (`animeSpeedField`, ≥801px) and `:1177` (`portraitSpeedField`) | racing |
| 2 | `.track.is-running::after` / `.bc-track::after` | `css/screens.css:988` (`animeForegroundStreaks`) and `:1190` (`portraitForeground`) | racing |
| 3 | Pixi `#backgroundLines` | `drawAnimeField()`, `src/arena/anime-effects.ts:6` | every frame |
| 4 | Pixi `#foregroundLines` | `drawForegroundRush()`, `src/arena/anime-effects.ts:61`, `blendMode "add"` | every frame |

The Pixi pair draw with `moveTo(x, y).lineTo(x - length, y)` — same `y`, so
**horizontal**, and `drawForegroundRush` colours two of every three lines
`0xffffff`. Mounted in `pixi-stage.ts:77-80`.

**Safe removal plan.** Racer-specific speed effects are a completely separate
system and would be unaffected:

- `drawRacerEffects()` in `src/arena/racer-effects.ts`, drawn into each
  actor's own `actor.fx` Graphics
- CSS `.trail-dust` / `.trail-spark` / `.trail-rainbow` on `.runner`

So layers 1–4 can be removed or dialled down **without killing racer
streaks**. Reduced-motion already dims them (`screens.css:1321-1324`, and
`effectScale` inside `anime-effects.ts`), which is the cheapest lever if you
want reduction rather than removal. Suggested order: kill 4 (foreground,
additive white, most visible), then 2, then reduce 1 and 3 to near-zero alpha.

Nothing was removed — none of it is dead code.

---

## 4. Current finish architecture (unchanged, for reference)

```
simulate()             authoritative truth
theatre.ts             dramatize(), planArcs(), allowance(), closingEase()
finishTrajectories()   precomputed per racer: crossSpeed, settle, tau, coastMs
presentFinish()        owns displayProgress / exiting / speed / phase
presentationScreenRatio()  ONE straight line, camera-independent (spec-enforced)
finishReveal()         marker sweep progress → --finish-reveal → CSS translateX
```

Geometry: `TRACK_START` 0.04, `FINISH_LINE_RATIO` 0.58, `MAX_SETTLE` 0.34,
`TRACK_SCALE` 0.54. Stripe parks at 58% of frame; run-out to ~95%.

**Live/shared parity is structural.** Neither page assigns `displayProgress`
or `exiting`, nor calls `coastProgress`/`settleOffset`/`finishPhase`. Both
call `finishTrajectories()` once and `presentFinish()` per racer per frame,
both read `presentationScreenRatio()`, both write `--finish-reveal`. The two
CSS rules differ only by selector.

Known non-finish divergence: Arena stops playback at `lastFinish + 3.2s`;
broadcast runs on off the database clock.

---

## 5. NEXT SESSION IMPLEMENTATION GOAL — **do not implement before then**

Desired behaviour:

```
open track
→ final seconds
→ finish structure enters from OFFSCREEN RIGHT
→ moves LEFT exactly once
→ racers keep running
→ racers pass through it
→ the structure continues its pass
→ no parking wall, no huddle, no reversal, no second entrance
```

**The scenery movement must be MONOTONIC.**

The *trigger* may depend on leader progress. The *movement after trigger*
must depend on elapsed time or a precomputed deterministic start time — **not
on reversible drawn progress**. Two workable shapes:

- latch a `sweepStartedMs` the first time `leaderProgress` crosses
  `REVEAL_FROM`, then drive the sweep from `elapsed - sweepStartedMs`; or
- precompute the start time from `sim.order[0].finishMs` minus a fixed lead
  (fully deterministic, no latch, identical in both views by construction)

The second is preferable: it needs no per-view mutable state, so live and
shared cannot disagree, and it is replay-safe when the broadcast clock is
rewound.

Also in scope for that session:

- reduce/remove the global white background streaks (layers 1–4 above);
  **preserve racer-specific speed streaks**
- address the huddle. The presentation lever is `CLOSE_FROM` / the closing
  envelope — letting theatre survive longer into the final stretch so the
  drawn field is not compressed *below* the truth at the line. **Do not
  touch `simulate()`'s drafting**; the ~1.4s field finish is authoritative.
- keep live/shared behaviour identical
- preserve authoritative `finishMs` and final order
- keep it cheap: no new per-frame geometry, no layout reads in the hot loop

---

## 6. Regression tests the next session should add

- finish scenery never reverses once it has started
- backward theatrical leader movement cannot reverse finish scenery
  (feed a deliberately decreasing `leaderProgress` sequence)
- finish marker enters exactly once
- racer x-position is unaffected by finish scenery (extend the existing spec)
- live/shared finish behaviour matches
- no global white background streak layer remains

Existing guards that must keep passing: `theatre.spec.ts` (13) — determinism,
no early crossing, bounded backslide, no jitter, smoothness ceilings;
`finish-presentation.spec.ts` — camera-independent geometry, run-out,
sweep timing, sweep moves no racer.

---

## 7. Explicitly untouched (unchanged from previous handoff)

1. `src/arena/engine.ts` is dead code while `ARENA_MIGRATION.md` marks that
   phase "Complete" — wire it or delete it
2. `--font-condensed` undefined; `.pet-option-label` still reaches for it
3. Two CSS namespaces (`.runner*` / `.bc-*`)
4. `pet-texture.ts` `normalizePet` vs `normalizeCharacter`
5. Editing `src/arena/character.ts` requires `pnpm build`
6. Perceptible stripe sweep ~300ms vs 500–900ms intended
7. Character Phases 2–6 — see `CHARACTERS.md`
8. **Race disparity / race shapes — deferred. Fix the finish first.**
