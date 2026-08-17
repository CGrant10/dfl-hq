# DFL HQ ARENA — NEXT SESSION: RACE SHAPE / DISPARITY

## Current version / commit

- branch **main**, version **1.93.0**
- deployed: GitHub Pages at `https://cgrant10.github.io/dfl-hq/`
- relevant recent commits:
  - `v1.93.0` finish docs corrected, dead post-finish API removed (this one)
  - `v1.92.0` finish stripe sweeps in from offscreen right
  - `v1.91.0` shared character compositor
  - `v1.90.0` run-out geometry, late stripe reveal, precomputed trajectories
  - `v1.89.0` theatre ported to TypeScript, backward movement became a feature

Toolchain: Node 24 LTS, pnpm 11.19.0 via corepack (`corepack pnpm <script>` —
bare `pnpm` is not on PATH, so `pnpm check` fails locally; run typecheck,
test and build separately).

---

## Architecture that must be preserved

```
simulate()            AUTHORITATIVE TRUTH — winner, order, finishMs.
   ↓                  Never changed by presentation. Parity fixtures in
                      engine.spec.ts pin three seeds byte-for-byte.
theatre.ts            PRESENTATION / DRAMA — dramatize(), planArcs(),
   ↓                  arcShape(), allowance(), the launch/open/close
                      envelopes. Typed, 13 specs.
finishTrajectories()  SHARED FINISH PATH — precomputed once per race;
presentFinish()       presentFinish() then owns displayProgress, exiting,
   ↓                  speed and phase for BOTH views.
playback              rAF interpolation → transform writes. Boring on purpose.
```

**Finish marker is scenery.** `presentationScreenRatio()` is camera-independent
and there is a spec that fails if that changes. `finishReveal()` drives a CSS
`translateX` sweep of the stripe element only — a spec asserts racer x is
byte-identical before, during and after the sweep.

**`composeCharacter()` is the single character source of truth.**
`CharacterConfig → composeCharacter() → renderer-neutral runs → SVG | Pixi`.

**Live/shared parity** is structural, not coincidental — see below.

---

## Verified this session

**Stale comments corrected** in `src/arena/finish-presentation.ts`: the
"stripe never moves / reveal is opacity only" block and `finishReveal()`'s
docstring both described the superseded fade. They now describe the sweep,
and state the distinction that matters — the *mapping* is fixed, the
*marker* moves. `presentation-frame.ts` had a comment naming a function that
no longer exists; corrected.

**Old finish APIs triaged:**

| export | verdict | action |
|---|---|---|
| `postFinishProgress()` | **dead** — no caller anywhere | deleted |
| `POST_FINISH_DISTANCE` | **dead** — only used by the above | deleted |
| `POST_FINISH_MS` | **live** | kept, documented |

`POST_FINISH_MS` is deliberately *not* a coast. Two things read it, both
state gates rather than positions: `allExited` in
`createFinishPresentation()`, and the default `RacerFrame.exiting` in
`presentation-frame.ts` which `presentFinish()` overwrites for every racer
in both views. **If it ever influences where a racer is drawn, there are two
post-finish models again.**

**One finish path — confirmed by grep, not assumption.** Neither
`js/pages/arena.js` nor `js/pages/broadcast.js` assigns `displayProgress`,
`exiting`, or calls `coastProgress`/`settleOffset`/`finishPhase` itself. Both
call `finishTrajectories()` once per race and `presentFinish()` per racer per
frame, both read `presentationScreenRatio()`, both write `--finish-reveal`
from `finishReveal(leaderProgress)`. The two CSS rules are identical apart
from the selector.

**One character path — confirmed.** `racer-view.js` (the shared markup
emitter used by both views) → `spriteMarkup()` → `characterSvg()` →
compositor. Profile preview → `characterSvg()` → compositor. Pixi →
`composeCharacter()` directly. Three consumers, one composition.

**Known remaining divergence (not a finish-model difference):** the Arena
view stops playback at `lastFinish + 3.2s`; the broadcast runs indefinitely
off the database clock. So the shared view shows finishers reaching their
asymptotes (12 evenly-spaced, place-ordered) while the live view truncates
(11 distinct). Same trajectory, different watch time. One constant in
`arena.js` if you ever want them identical.

**Results:** typecheck clean · **88 tests, 13 files, all passing** · build
clean.

---

## Current verified baseline

Measured over 40 seeded 12-racer races, short length:

| metric | value |
|---|---|
| avg max field spread | **0.447** |
| max field spread | 0.546 |
| max deficit behind own true position | **0.284** (avg 0.118) |
| deep collapses (>0.15 deficit) | 140 |
| comeback stories (≥3 places regained) | 294 |
| max backslide per tick | 0.023 |
| winner / order / finishMs mismatch | **0** |
| early crossing | **0** |
| off-track | **0** |
| deterministic replay mismatch | **0** |

Bounds: `MAX_LEAD` 0.46, `MAX_DROP` 0.38, both soft-minimum (`L*tanh(x/L)`)
so there is no corner in the derivative. Envelopes: `LAUNCH_ZONE` 0.07,
`OPEN_ZONE` 0.26, `CLOSE_FROM` 0.88. Smoothness ceilings asserted in
`theatre.spec.ts`: max step 0.028/tick, max jerk 0.0055/tick.

Finish: stripe at 58% of frame, run-out to ~95%, sweep parks **1599ms**
before the first crossing, finishers settle at 61–70% on a 375px phone.

---

## NEXT SESSION GOAL — race disparity / duck-race drama

**Only this. Nothing else.**

Races still feel too similar and too neck-and-neck. The primitives are good;
what is missing is a race-level decision made *before* individual arcs.

### Race shapes, seeded

Introduce `raceProfile(seed)` and plan arcs from it, instead of every race
drawing from the same pool:

| profile | character |
|---|---|
| **TIGHT** | compact field, lots of close movement, smaller amplitudes |
| **RUNAWAY** | one racer builds and *holds* a large lead; fewer comeback corrections |
| **COLLAPSE** | an early front-runner falls dramatically behind |
| **HEROIC COMEBACK** | one deep collapse, long hold, delayed powerful charge |
| **SPLIT FIELD** | coordinated positive/negative arcs forming front/mid/back groups |
| **CHAOTIC** | multiple large arcs, big expansion then compression |

Not every race gets every behaviour. **The seed picks the personality.** The
goal is different race *story shapes*, not more total events.

### Desired visual disparity

It should be normal to see:

```
Leader  72%
2nd     61%
Middle  50–58%
Last    34%
```

…then the leader fades, the field compresses, and the last-place racer
starts a heroic charge and reshuffles positions.

**Large gaps should be allowed to persist.** Do not force everyone back
toward the pack too quickly — that is what makes it feel neck-and-neck now.
`CLOSE_FROM` (0.88) and the `fade` term are the levers that pull the field
together; the arcs are what push it apart.

### Backward visual movement stays

This is a **feature**, added deliberately in v1.89.0. Keep collapse
backslides, bounded negative visual velocity, smooth zero-slope arcs, no
jitter, no off-track movement, no early finish crossing.

**Do not restore the old monotonic floor.**

### Correctness invariants

```
winner mismatch              = 0
final-order mismatch         = 0
finishMs mismatch            = 0
early crossing               = 0
off-track                    = 0
deterministic replay mismatch = 0
```

Intentional backward visual movement is allowed and expected.
`theatre.spec.ts` already fails on every one of these — use it.

### Performance rules

Race-profile decisions and long-form arcs are **precomputed**:

```
simulation → race profile → precomputed arcs → dramatized samples
           → playback interpolation → transform writes
```

No profile logic in `requestAnimationFrame`. Keep the hot loop boring.

---

## Explicitly left untouched

Not bugs; deliberate deferrals, in rough priority order:

1. **`src/arena/engine.ts` is dead code** — a careful TypeScript port of the
   simulation with real parity fixtures, imported only by its own spec, while
   `ARENA_MIGRATION.md` marks that phase "Complete". Either wire it as the
   single simulation or delete it.
2. **`--font-condensed` was never defined anywhere**, so every `font:`
   shorthand reaching for it is discarded whole. Fixed on the racer tag;
   `.pet-option-label` in the Pet editor still has it.
3. **Two CSS namespaces** (`.runner*` / `.bc-*`). Markup can't drift — one
   emitter — but the stylesheets are duplicated.
4. **`pet-texture.ts`'s `normalizePet`** sits alongside `normalizeCharacter`;
   merge during character Phase 2.
5. **Editing `src/arena/character.ts` requires `pnpm build`** — the SVG side
   imports from the built bundle. Real footgun.
6. **Perceptible stripe sweep ~300ms** vs the 500–900ms intended; smoothstep's
   zero-slope start hides the opening travel. Lever is a linear ramp with
   eased ends.
7. Character Phases 2–6 — see `CHARACTERS.md`.
8. Finish details — see `FINISH.md`.
