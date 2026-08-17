# DFL HQ ARENA — NEXT SESSION: FINISH HUDDLE (closingEase)

## Done in v1.94.0 — do not redo

**Boomerang: FIXED.** `finishReveal(leaderProgress)` is deleted. The marker is
driven by `finishPassProgress(elapsedMs, firstFinishMs, lastFinishMs)` — a
clamped ramp on the clock, monotonic by construction, stateless, seekable,
identical live/shared. Verified over **26 seeds including 32676**: zero
reversals, zero backward travel.

**Parking: GONE.** One continuous right-to-left pass. Measured on seed 90210:
stripe at 153% of frame at half-race and 2s before the first finish (offscreen,
hidden), 77% at the first crossing, 9% at the last crossing, -37% after
everyone is home. It never stops and never re-enters.

**Global white streaks: OFF.** CSS `.track.is-running::before/::after` and the
`.bc-track` equivalents get `content:none`; `drawAnimeField()` and
`drawForegroundRush()` are no longer called and their Graphics are cleared
each frame (layers stay mounted so the display list and chunk graph are
unchanged). Racer-specific effects untouched: `drawRacerEffects()` per actor,
`.trail-*`, surge/stumble/duel classes.

**Tests:** 89 passing. New: monotonic-pass regression, hidden-until-late,
cannot-be-dragged-backwards, live/shared identical derivation.
typecheck clean, build clean, version 1.94.0.

---

## NOT DONE — this is the next session's job

### 1. The presentation-caused huddle (`closingEase`)

**Untouched.** Still `CLOSE_FROM = 0.88` with a whole-field smoothstep.
Measured previously:

| | seed 1000 | seed 90210 |
|---|---|---|
| drawn spread mid-race | 0.546 | 0.185 |
| drawn spread at first crossing | **0.129** | 0.103 |
| TRUTH spread at first crossing | 0.183 | 0.112 |

The drawn field is compressed **below the truth** at the line — a ~76%
collapse landing exactly when the finish should look dramatic.

Options in `src/arena/theatre.ts`:

- move `CLOSE_FROM` later (0.94+)
- gentler envelope (currently `1 - smoothstep(...)`)
- **preferred:** close down per racer against *their own* distance/time to
  their authoritative `finishMs`, rather than one shared progress threshold —
  a racer 3 seconds from home should still be allowed their arc while the
  leader converges

Constraint: drawn must still meet truth at each racer's official crossing.
`theatre.spec.ts` enforces no-early-crossing, bounded backslide, determinism
and smoothness — those must keep passing.

### 2. Measurements to repeat after the fix

mid-race spread · 2s before first finish · first crossing · middle finishers ·
last crossing. Judge the **temporal shape**, not just max spread.

### 3. Visual acceptance not yet performed

I ran the numeric verification only. **Nobody has watched a race on desktop or
phone since this change.** Confirm: no line for most of the race, one
continuous pass, no boomerang, racers run through it, streaks gone, racer
effects intact, live and shared match.

---

## Architecture that must be preserved

```
simulate()            authoritative truth — never touched
theatre.ts            dramatize / planArcs / allowance / closingEase
finishTrajectories()  precomputed per racer
presentFinish()       owns displayProgress / exiting / speed / phase
presentationScreenRatio()  ONE straight line, camera-independent (spec)
finishPassProgress()  scenery only, time-derived, monotonic
composeCharacter()    single character source of truth
```

Geometry: `TRACK_START` 0.04, `FINISH_LINE_RATIO` 0.58, `MAX_SETTLE` 0.34.
Correctness invariants (all currently 0): winner / order / finishMs mismatch,
early crossing, off-track, replay mismatch.

---

## Still deferred

1. `src/arena/engine.ts` dead while `ARENA_MIGRATION.md` says "Complete"
2. `--font-condensed` undefined; `.pet-option-label` still reaches for it
3. Two CSS namespaces (`.runner*` / `.bc-*`)
4. `pet-texture.ts` `normalizePet` vs `normalizeCharacter`
5. Editing `src/arena/character.ts` requires `pnpm build`
6. Character Phases 2–6 — see `CHARACTERS.md`
7. **Race disparity / race shapes — after the huddle fix**
