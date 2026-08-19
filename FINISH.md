# Arena finish presentation

Status: **the finish line is scenery.** It rolls in along the ground at the
racers' own speed, comes to rest on the line, the field runs *through* it into a
run-off wide enough to fan them out, and it times each racer as they touch it.

---

## What was wrong, and it was four things at once

The stripe was a DOM `<div class="bc-finish">`: a 0.65vw glowing bar at
`right:42%`, `z-index:4`, sliding in from `translateX(55vw)` over 1100ms. Every
one of those four facts says "graphic":

| | old | why it read as UI |
|---|---|---|
| position | `right:42%`, its own anchor | its own coordinate system, unrelated to where racers are drawn |
| layer | z-index 4 — **above** the Pixi canvas (1) and the runners (2/3) | the field ran *behind* the finish line |
| speed | 55vw in 1100ms | ~11x the leader's own screen speed |
| easing | ease-out cubic over the whole travel | fastest on frame one, decelerating throughout — nothing on the ground moves like that |

And the run-off was 0.34, which parks twelve finishers across 18% of the frame
— about 1.2% each against a drawn racer **10%** of the frame wide. So they
overlapped almost completely. That is the "racers huddle up to it" complaint,
and it survived two previous passes because the run-off was being measured as a
fraction of the frame rather than in racer widths.

---

## What it is now

### It stands in the racers' coordinate system

`finishGroundRatio(elapsedMs, firstFinishMs)` returns a **ratio of the frame** —
the same units `presentationScreenRatio()` returns for a racer — and comes to
rest at exactly `presentationScreenRatio(1)`. The page writes it to
`--finish-x` and the CSS is `left:calc(var(--finish-x) * 100%)`. There is no
transform and no transition: it moves because its position moves, once per
frame.

It is carried on the presentation object as `finish.groundRatio`, so every
renderer places it from one number derived from one clock and the two views
cannot disagree about where the finish line is.

### It is behind the field

`z-index:0`, which puts it above the scenery and **below** both the Pixi canvas
(z-index 1) and the DOM runners (2/3). The racers run in front of it. This is
the single biggest reason it now reads as part of the course, and it cost one
line.

### It moves at ground speed

`FINISH_ROLL_MS` is **4800**, and the number is derived rather than tasted:

```
travel = FINISH_ENTRY_RATIO - FINISH_LINE_RATIO = 1.02 - 0.58 = 0.44
racers ~ 1e-4 of the frame per ms through the final stretch
rollMs = 0.44 * ROLL_SLOPE / 1e-4  ~=  4835
```

`finish-presentation.spec.ts` asserts the structure/racer speed ratio stays
under 3x and fails if this drifts back into flying.

The easing is linear-then-settle, with the slope **solved** rather than picked:
`e(r<=a) = k*r`, `e(r>a) = k*a + (1-k*a)*(1-((1-r)/(1-a))^2)`, and matching the
slopes at `a` gives `k(1+a)=2`. At `a = ROLL_LINEAR_UNTIL = 0.82` that is
`k = 1.0989`, so **90% of the travel happens at one constant velocity** and the
last tenth bleeds off over the final 18% of the time. A heavy thing rolling to
a stop.

It is still settled `FINISH_SETTLED_LEAD_MS` (420ms) before the first crossing,
and it is still a clamped ramp on a clock: monotonic, stateless between frames,
seekable, replay-safe, and structurally incapable of being dragged backwards by
a racer falling back.

### It looks like a structure

Posts through the lane band, a gantry capping the top, a checkered face and a
contact shadow at the base — all in the one `.bc-stage .bc-finish` block. Two
traps found while building it, both now commented in the CSS:

- the gantry at `top:-1.5vw` floated in the sky band with grass between it and
  its own post, which reads as a detached chip
- a phone override re-set `top:-2.4vw`, undoing the fix at exactly the widths
  where it mattered most

### The run-off fans the field

`MAX_SETTLE` 0.34 -> **0.65** (0.58 -> 0.931 of the frame), and — the part that
actually mattered — `settleOffset()` derives its per-place step from the run-off
and the field size instead of a flat 0.022:

```
step = (MAX_SETTLE - SETTLE_MIN) / (count - 1)
```

Widening `MAX_SETTLE` alone slid the whole pack further down the track without
spreading it, because a flat step fans twelve racers across 0.242 of progress no
matter how much room exists. Same pile, further right.

Measured, seed 90210, twelve racers, real `simulate()` + `dramatize()`:

| | old | now |
|---|---|---|
| settled span | 61.1–69.7% (~8.6%) | **63.4–90.5% (27.1%)** |
| per place | ~1.2% of frame | ~2.5% of frame |
| distinct spots | 11 of 12 | **12 of 12** |
| everyone past the line | yes | yes (63.4% > 58%) |
| anyone off frame | no | no (90.5% < 95%) |

### It times them

`finishStamp(order, elapsedMs)` — pure, seekable, no state between frames —
returns the racer currently on the line with a `fade`. `STAMP_HOLD_MS` is 1400,
deliberately longer than the tightest gap the sim produces, so when two
crossings arrive 120ms apart the **later** one takes the slot outright rather
than the two smearing over each other. The board keeps the full order; this is
the touch.

The stamp rides the same `--finish-x` as the structure so it cannot drift off
the line it is reporting, and it is the one part of this that IS a graphic —
`z-index:6`, above the racer plane, because a time with a racer standing on it
is not a timing display.

`P1 · 10.17s`. The place needs the `P` and the separator: at first pass a bare
`1` ran into the seconds and read as "110.17s".

---

## Verified

`npx tsc --noEmit` clean · **292 tests across 20 files** (115 of them the 13
arena files) · `npx vite build` clean. The suite was 280 before this pass; the
twelve new ones are the roll velocity, the constant-velocity middle, the racer
coordinate system, monotonicity, the in-shot-and-moving window, the stamp and
its fade, the presentation carrying both, and three on the run-off fan.

Visually, in a throwaway `_verify/` harness driving the **real**
`simulate()`/`dramatize()`/`finishTrajectories()` and the **real** stylesheets,
at 800x560 and 375x812:

- roll measured 102% -> 82.1 -> 71.1 -> 60.4 -> 58.0, monotonic, ~11%/s
  constant then easing to rest at -420ms
- leader crosses at exactly 58.0%
- **racers drawn in front of the structure at the crossing frame**
- run-out 58 -> 61.4 -> 65.8 -> 71.9 -> 80.3 -> 86.6 -> settled 90.5%
- stamps fired P1 10.17s, P4 11.54s, P5 12.34s, P11 15.48s

Two harness lessons worth keeping, both of which cost a pass here:

1. **A fake sim gives `crossingSpeeds()` nonsense.** `samples: [[0,1],...]`
   makes `tau` enormous and the coast then barely moves — so the run-out looked
   broken when it was fine. Drive the real `simulate()`.
2. **One shared bust, in an import map.** `race.js` imports
   `./pixi-runtime.js`; importing `pixi-runtime.js?bust=x` separately gives two
   module identities and Pixi throws *Extension type application already has a
   handler*. Map every `/js/` module to the same busted URL.

`.claude/launch.json` now carries the static server on 8794, so the next visual
pass is one `preview_start` rather than a hand-rolled server.

---

## Caveats

- `FINISH_ENTRY_RATIO` is 1.02 — just off the frame, clipped by the track's
  `overflow:hidden`. It is not derived; it only has to be past the right edge.
- Twelve racers cannot stand clear of each other in the run-off. That needs
  120% of the frame. The stagger reads, the separation does not exist, and any
  further improvement is arc composition rather than geometry.
- The finish structure is still DOM, per the standing contract that Pixi
  replaces racer art only. Drawing it in the Pixi `course` container would be
  the more literal "part of the background", but the DOM fallback would then
  lose its finish line.
- The harness verified the geometry, the layering and the stylesheets against
  the real modules. It did **not** exercise the live broadcast page end to end —
  that needs a shared race event in Supabase, and the standing rule is never to
  write to production to test.

---

# NEXT SESSION — race disparity / duck-race drama

**Not started. Do not treat any of this as in progress.**

Goals: larger field spread, racers genuinely far ahead and far behind, fewer but
stronger breakaways, collapses, heroic comebacks, intentional visual backward
movement, different seeded race *shapes* — while preserving `finishMs` and final
order exactly.

Everything needed already exists in **`src/arena/theatre.ts`**, typed and
covered by `src/arena/theatre.spec.ts`: `planArcs()`, `arcShape()` with its hold
plateau, `allowance()` with the asymmetric soft-min bounds, `MAX_LEAD` /
`MAX_DROP`, and the launch/open/close envelopes. Backward movement is already
implemented and bounded — this is a **tuning and arc-shaping pass**, not new
machinery.

Baseline over 40 seeds (12 racers): avg max field spread 0.447, max deficit
behind own true position 0.284, 140 deep collapses, 294 comeback stories, zero
correctness failures.

Note that the **post-crossing** huddle is now fixed; what remains is the
**mid-race** spread at the first crossing, which ARENA-NEXT.md explains is
dominated by arc composition rather than by the closing envelope. Do that pass
and re-measure; do not tune `CLOSE_MS` expecting the number to move.
