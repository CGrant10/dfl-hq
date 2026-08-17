# Arena finish presentation — complete

Status: **done and stable.** The finish structure sweeps in from offscreen
right, racers fly through at speed, and the run-out geometry is unchanged.

---

## Files changed (this session)

| file | change |
|---|---|
| `src/arena/finish-presentation.ts` | `REVEAL_FROM` 0.90 → **0.868**, `REVEAL_FULL` 0.955 → **0.92**. Comment records why. |
| `src/arena/finish-presentation.spec.ts` | sweep-timing spec; new spec proving the sweep moves no racer. |
| `css/screens.css` | `.track-finish` — fade replaced by `translateX` sweep. |
| `css/broadcast.css` | `.bc-finish` — identical treatment. |

Nothing else. Racer mapping, run-out geometry, coast and theatre untouched.

---

## How the sweep works

`finishReveal(leaderProgress)` is a smoothstep from `REVEAL_FROM` to
`REVEAL_FULL`, written to `--finish-reveal` on the wrapper once per frame
(only when the value changes). The CSS is two properties:

```css
transform: translateX(calc((1 - var(--finish-reveal,0)) * 55vw));
opacity:   min(1, calc(var(--finish-reveal,0) * 4));
```

- **reveal 0** → +55vw, comfortably offscreen right at every width; `.track`
  and `.bc-track` both have `overflow:hidden` so it is clipped, not spilling.
- **reveal 1** → `translateX(0)`, parked at `right:42%` = 58% of the frame.
- Opacity reaches 1 at reveal 0.25, i.e. **while the stripe is still
  travelling** — so it reads as arriving, not materialising.
- **No CSS transition.** The variable already updates per frame from a
  smoothstep; a transition on top of that smears rather than smooths.

Cost: one `style.setProperty` per frame during the sweep, one compositor
transform. No layout reads, no new per-frame geometry.

---

## Trigger timing

Leader **drawn** progress 0.868 → 0.92.

Measured on seed 90210 (short race, 375px):

| | |
|---|---|
| stripe before sweep | 112.8% of track, opacity 0 |
| sweep starts | 9200ms race time |
| parked | 9500ms race time, at 57.6% |
| first official crossing | 11099ms |
| **margin before first crossing** | **1599ms** |

Two calibration findings worth keeping:

1. **`leaderProgress` is the DRAWN position, not the truth.** It is held
   below the truth near the line by the shrinking lead allowance, so it
   arrives later than raw progress suggests. A first attempt ending the
   sweep at 0.955 parked ~40ms **after** the winner had crossed. 0.92 is the
   fix.
2. **The band is very non-linear in time** because the leader is
   accelerating through the final stretch. 0.855–0.92 measured 1.4s of
   travel; 0.885–0.92 measured 300ms. Only the START moves the duration —
   the margin depends solely on `REVEAL_FULL`.

---

## Shared / live parity

Both views already share the finish path and were changed identically:

- geometry: `presentationScreenRatio()` — camera-independent, one straight
  line, **spec-enforced**
- trajectory: `finishTrajectories()` + `presentFinish()` in
  `src/arena/theatre.ts`, called by both `js/pages/arena.js` and
  `js/pages/broadcast.js`
- reveal: both call `finishReveal(leaderProgress)` and write
  `--finish-reveal`; the two CSS rules are byte-identical apart from the
  selector

There is no second implementation to drift.

---

## No huddle — verified

Same race, 375px mobile:

- stripe parks at **57.6%**; all twelve finishers end up at **61.1–69.7%**,
  i.e. every one of them past the line, in open space
- 11 distinct settled positions out of 12
- crossing is continuous: no stop, monotonic, velocity ratio 0.70–0.995
  measured across three seeds in the previous session
- no clamp at progress = 1 anywhere in the path

---

## Results

`pnpm typecheck` clean · **88 tests pass** (13 files) · `pnpm build` clean.
Mobile verified at 375×812; race completes with no console errors.

---

## Caveats

- **Perceptible sweep measures ~300ms**, below the 500–900ms suggested.
  Smoothstep has zero slope at both ends, so the first slice of travel is
  imperceptible and the detector only sees the fast middle. Widening
  `REVEAL_FROM` moves this around non-linearly (see above). If you want a
  longer visible slide, the cleanest lever is to make `finishReveal` a
  linear ramp with small eased ends rather than a full smoothstep.
- `55vw` is a viewport unit used against a track that is *not* always the
  viewport width. It is always *more* than enough, never less, so the stripe
  is always fully offscreen — but it is not a precise "just offscreen"
  value. Container query units (`cqw`) would be exact if the track is ever
  made a container.
- The stripe is `scaleY`-free now; the old fade also scaled it slightly.
  Dropped deliberately — a sweep does not need a second effect.

---

# NEXT SESSION — race disparity / duck-race drama

**Not started. Do not treat any of this as in progress.**

Goals:

- larger field spread
- racers genuinely far ahead and far behind
- fewer but stronger breakaways
- collapses
- heroic comebacks
- intentional visual backward movement
- different seeded race *shapes*, so races do not all feel alike
- preserve `finishMs` and final order exactly
- precompute long-form theatre arcs
- keep the rAF loop cheap

Everything needed already exists in **`src/arena/theatre.ts`**, typed and
covered by `src/arena/theatre.spec.ts` (13 specs): `planArcs()`, `arcShape()`
with its hold plateau, `allowance()` with the asymmetric soft-min bounds,
`MAX_LEAD` / `MAX_DROP`, and the launch/open/close envelopes. Backward
movement is already implemented and bounded — this is a **tuning and arc-
shaping pass**, not new machinery.

Current measured baseline over 40 seeds (12 racers): avg max field spread
**0.447**, max deficit behind own true position **0.284**, 140 deep
collapses, 294 comeback stories, zero correctness failures.

The specs in `theatre.spec.ts` will fail if a tuning change breaks
determinism, lets a racer cross early, slides one behind the start line,
turns a backslide into jitter, or makes the motion coarser. Use them.
