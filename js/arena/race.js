// =====================================================================
// arena/race.js - the simulation. No DOM in this file.
// ---------------------------------------------------------------------
// The race is simulated to completion BEFORE anything animates, and the
// renderer then plays back the recording. That split buys three things:
//
//   * the finish order is known and fair, decided by the model rather than
//     by frame timing on whatever phone is watching
//   * a slow device drops frames instead of changing who wins
//   * the same seed replays the same race, so a saved event can be watched
//     again and it is the real one, not a re-roll
//
// HOW IT LOOKS LIKE A RACE
// Constant speeds are a progress bar, and pure per-frame randomness is
// teleportation. What reads as a race is momentum: each racer eases toward
// a target speed that itself drifts, so movement is smooth but never
// uniform. On top of that:
//
//   talent        a small fixed edge, so form is not pure noise
//   bursts        short accelerations that visibly pass people
//   stumbles      brief slowdowns, the same thing in reverse
//   drafting      a gentle pull toward the pack, which keeps the field
//                 together, manufactures lead changes, and is what makes
//                 photo finishes happen instead of a runaway
//   clutch        a final-stretch surge, per racer, so the last 20% of the
//                 track actually decides something
// =====================================================================

/** Deterministic RNG (mulberry32). Same seed, same race, every time. */
function rng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed() {
  return Math.floor(Math.random() * 2147483647) + 1;
}

/** Tick length. 40ms = 25 simulated steps a second, plenty for smooth playback. */
export const TICK_MS = 40;

export const LENGTHS = {
  short:  { label: "Short",  ticks: 300 },   // ~12s
  medium: { label: "Medium", ticks: 550 },   // ~22s
  long:   { label: "Long",   ticks: 900 },   // ~36s
};

export function ticksFor(lengthKey, customTicks) {
  if (lengthKey === "custom") {
    const n = Number(customTicks);
    return Number.isFinite(n) && n > 60 ? Math.min(n, 3000) : LENGTHS.medium.ticks;
  }
  return (LENGTHS[lengthKey] || LENGTHS.medium).ticks;
}

/** Seconds a race of this length will take to watch. */
export function raceSeconds(lengthKey, customTicks) {
  return Math.round((ticksFor(lengthKey, customTicks) * TICK_MS) / 1000);
}

/**
 * Run the whole race.
 *
 * @param {Array} racers  objects with an `id` (used only to label output)
 * @param {number} ticks  race length
 * @param {number} seed
 * @returns {{samples: Float32Array[], order: Array, ticks: number, finishTick: number}}
 *   samples[i][t] is racer i's progress (0..1) at tick t.
 */
export function simulate(racers, ticks, seed) {
  const n = racers.length;
  const rand = rng(seed);
  if (!n) return { samples: [], order: [], ticks, finishTick: 0 };

  // A racer's fixed character, drawn once so it is stable for this seed.
  const talent = [], clutch = [], jitter = [];
  for (let i = 0; i < n; i++) {
    talent.push(0.93 + rand() * 0.14);   // 0.93 - 1.07
    clutch.push(0.90 + rand() * 0.26);   // who shows up at the end
    jitter.push(0.55 + rand() * 0.9);    // how erratic they are
  }

  // Distance is abstract: everybody covers 1.0, and the speed scale is set
  // so an average racer arrives near the final tick.
  const BASE = 1 / ticks;

  const progress = new Float64Array(n);
  const speed    = new Float64Array(n).fill(BASE);
  const target   = new Float64Array(n).fill(BASE);
  const burst    = new Int16Array(n);        // ticks of burst remaining
  const stumble  = new Int16Array(n);

  /*
    The clock is a target, not a wall.

    `ticks` is where an AVERAGE racer arrives, so a slow one is still short
    of the line when it runs out - and a racer frozen at 99% who never
    crosses looks like a bug rather than a last place. So the simulation is
    allowed to run on until everybody is home, with a hard cap so a
    pathological seed cannot loop forever.
  */
  const maxTicks = Math.ceil(ticks * 1.6);
  const samples = Array.from({ length: n }, () => new Float32Array(maxTicks + 1));
  const finishTick = new Float64Array(n).fill(-1);

  let done = 0;
  let t = 0;

  for (; t <= maxTicks && done < n; t++) {
    // The pack, for drafting. Only racers still running count.
    let sum = 0, live = 0;
    for (let i = 0; i < n; i++) {
      if (finishTick[i] < 0) { sum += progress[i]; live++; }
    }
    const packMean = live ? sum / live : 0;

    for (let i = 0; i < n; i++) {
      if (finishTick[i] >= 0) { samples[i][t] = 1; continue; }

      // --- events ---
      if (burst[i] === 0 && stumble[i] === 0) {
        const roll = rand();
        if (roll < 0.012)      burst[i]   = 12 + Math.floor(rand() * 26);
        else if (roll < 0.024) stumble[i] = 10 + Math.floor(rand() * 22);
      }
      if (burst[i] > 0)   burst[i]--;
      if (stumble[i] > 0) stumble[i]--;

      // --- the speed this racer is currently aiming for ---
      const frac = progress[i];
      let want = BASE * talent[i];

      // drifting noise, scaled by how erratic they are
      want *= 1 + (rand() - 0.5) * 0.22 * jitter[i];

      if (burst[i] > 0)   want *= 1.35;
      if (stumble[i] > 0) want *= 0.72;

      // Drafting: behind the pack pulls you forward, out front holds you
      // back. Small, but it is what keeps the field racing each other.
      want *= 1 + (packMean - frac) * 0.55;

      // Final stretch, last 20%.
      if (frac > 0.8) want *= 1 + (frac - 0.8) * 1.6 * clutch[i];

      // --- momentum: ease toward the target rather than snapping ---
      target[i] = want;
      speed[i] += (target[i] - speed[i]) * 0.16;
      if (speed[i] < BASE * 0.35) speed[i] = BASE * 0.35;   // nobody stops dead

      progress[i] += speed[i];

      if (progress[i] >= 1) {
        // Interpolate within the tick so two racers on the same tick still
        // separate - this is where a 0.04 second finish comes from.
        const over = (progress[i] - 1) / speed[i];
        finishTick[i] = t - over;
        progress[i] = 1;
        done++;
      }
      samples[i][t] = progress[i];
    }
  }

  // t has already been incremented past the last tick the loop wrote, so the
  // last WRITTEN index is t-1. Padding from t would copy a tick that was
  // never filled, leaving the tail of every lane at zero.
  const lastWritten = Math.max(0, Math.min(t - 1, maxTicks));

  // Anyone still going at the cap is placed by distance covered, and their
  // lane is held at wherever they got to rather than left at zero.
  for (let i = 0; i < n; i++) {
    if (finishTick[i] < 0) finishTick[i] = maxTicks + (1 - progress[i]) * ticks;
    const held = samples[i][lastWritten];
    for (let k = lastWritten + 1; k <= maxTicks; k++) samples[i][k] = held;
  }

  const order = racers
    .map((r, i) => ({ racer: r, index: i, finishMs: Math.round(finishTick[i] * TICK_MS) }))
    .sort((a, b) => a.finishMs - b.finishMs)
    .map((row, idx) => ({ ...row, place: idx + 1 }));

  // `frames` is the highest index the renderer may read. It is NOT `ticks`:
  // the race can legitimately have run past that.
  return { samples, order, ticks, frames: maxTicks, finishTick: Math.max(...finishTick) };
}

/* =====================================================================
   THE THEATRE LAYER
   ---------------------------------------------------------------------
   simulate() decides the race. This does not, and must not.

   WHY IT IS A SEPARATE PASS. The Arena is a decider - a race settles the
   draft order, and saveResults() stores the finishing order together with
   its seed so a completed event can be replayed and watched again. That
   makes the physics in simulate() effectively historical data: change a
   constant up there and every event ever run replays with a different
   winner than the one recorded in arena_results. So the drama is added
   AFTERWARDS, to the drawing only.

   WHAT IT GUARANTEES, and these are the whole contract:

     1. sim.order is untouched. Who wins, and by how much, is exactly what
        simulate() decided.
     2. The wobble is scaled by (1 - progress), so it is at its largest at
        the start and mathematically zero at the line. The last stretch is
        the true race, which is why the finish still matches the result.
     3. A racer never moves backwards. Being passed is somebody else
        moving faster, never you sliding back - that reads as a glitch.
        The shown position is monotonic, so a wobble that wants to pull a
        racer back becomes a STALL instead, which is what a real one looks
        like anyway.
     4. Nobody visually crosses the line before they actually finish.

   Seeded from the race's own seed, so a replay is the same performance as
   well as the same result.
   ===================================================================== */

/*
  How far off the truth a racer may be DRAWN. Raised from 0.085 in the
  chaos pass: at the old value the theatre was a gentle sway and the race
  still read as a queue. This is about a sixth of the track, which is
  enough to actually lose and regain a place.
*/
const THEATRE = 0.155;

/*
  And a hard ceiling on how far the drawing may run ahead of the truth.

  Without it the monotonic clamp compounds: a racer pushed forward cannot
  come back, so peaks stack and the drawn position drifted up to 46% of
  the track from the real one - which is not drama, it is a racer parked
  at a standstill for ten seconds while the truth catches up. A fifth of
  the track is a place or two, which is the point, and it self-releases
  because the truth only ever moves forward.
*/
const MAX_LEAD = 0.22;

/** The scripted moments. 3-5 a race, never more - constant chaos is noise. */
const KINDS = ["surge", "stumble", "breakaway", "comeback", "push"];

/**
 * Visual positions for playback, plus the moments that produced them.
 *
 * @returns {{shown: Float32Array[], events: Array}}
 *   events are {kind, racer, ms, durMs} and drive both the callouts and
 *   the characters' reactions, so the words, the animation and the
 *   movement all describe the SAME thing.
 */
export function dramatize(sim, seed) {
  const n = sim.samples.length;
  if (!n) return { shown: sim.samples, events: [] };
  const rand = rng(((seed >>> 0) ^ 0x9e3779b9) >>> 0);
  const frames = sim.frames;

  /*
    Each racer's baseline: two waves at different rates, so nobody moves
    like a metronome. These are what produce the CONSTANT jockeying -
    measured at 296 lead changes over 40 races before the theatre layer
    and 447 after - while the scripted events below produce the handful
    of moments somebody would actually shout about.

    Tuned once already: the first chaos pass raised the amplitude and
    lowered these, which bought bigger gaps and FEWER lead changes. More
    oscillation beats more separation for making a race feel close.
  */
  const wave = [];
  for (let i = 0; i < n; i++) {
    wave.push({
      a1: 0.60 + rand() * 0.55, f1: 1.3 + rand() * 2.2, p1: rand() * Math.PI * 2,
      a2: 0.34 + rand() * 0.46, f2: 3.0 + rand() * 3.6, p2: rand() * Math.PI * 2,
      amp: 0.85 + rand() * 0.6,
    });
  }

  /*
    THE SCRIPT. Three to five moments spread across the middle of the
    race. Each is a shaped bump on the DRAWN position - big enough to
    change a place, always folded away before the line.

    A comeback is handed to whoever is actually behind at that moment and
    a breakaway to whoever is ahead, so the drama agrees with the picture
    rather than fighting it.
  */
  const script = [];
  const wanted = 3 + Math.floor(rand() * 3);
  const used = new Set();
  for (let k = 0; k < wanted; k++) {
    const at = 0.18 + (k / wanted) * 0.55 + rand() * 0.08;
    const kind = KINDS[Math.floor(rand() * KINDS.length)];

    let tick = 0;
    while (tick < frames && sim.samples[0][tick] < at) tick++;
    const standing = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => sim.samples[b][tick] - sim.samples[a][tick]);

    let racer;
    if (kind === "comeback") racer = standing[n - 1 - Math.floor(rand() * Math.min(2, n))];
    else if (kind === "breakaway") racer = standing[Math.floor(rand() * Math.min(2, n))];
    else racer = Math.floor(rand() * n);

    const key = `${racer}:${Math.round(at * 5)}`;
    if (used.has(key)) continue;                 // not twice on one racer at once
    used.add(key);

    script.push({
      kind, racer, at,
      width: kind === "stumble" ? 0.10 : 0.13,
      /* A stumble pulls back, everything else pushes on. Pulling back is
         safe because the monotonic clamp below turns it into a STALL
         rather than into reverse motion. */
      power: kind === "stumble" ? -(0.8 + rand() * 0.7) : (0.9 + rand() * 0.9),
    });
  }

  const shown = Array.from({ length: n }, () => new Float32Array(frames + 1));
  const events = [];
  const stamped = new Set();

  for (let i = 0; i < n; i++) {
    const w = wave[i];
    const src = sim.samples[i];
    const mine = script.filter((e) => e.racer === i);
    let prev = 0, prevTruth = 0;
    for (let t = 0; t <= frames; t++) {
      const truth = src[t];
      const fade = truth >= 1 ? 0 : Math.pow(1 - truth, 1.35);

      const phase = truth * Math.PI * 2;
      let wob = Math.sin(phase * w.f1 + w.p1) * w.a1
              + Math.sin(phase * w.f2 + w.p2) * w.a2;

      for (const e of mine) {
        const d = (truth - e.at) / e.width;
        wob += e.power * Math.exp(-d * d);
        const key = `${i}:${e.kind}:${e.at}`;
        if (!stamped.has(key) && truth >= e.at) {
          stamped.add(key);
          events.push({ kind: e.kind, racer: i, ms: t * TICK_MS, durMs: 1400 });
        }
      }

      let p = truth + wob * w.amp * THEATRE * fade;

      // The four rules that keep this honest.
      if (p > truth + MAX_LEAD) p = truth + MAX_LEAD;   // never a runaway

      /*
        NEVER BACKWARDS, AND NEVER DEAD STOPPED.

        Holding at `prev` was enough to stop reverse motion, but a racer
        whose wobble had gone negative could sit at a literal standstill
        for eight seconds of a twenty-second race waiting for the truth to
        catch up - which reads as a bug, not a stumble. The floor now
        creeps forward at a fraction of the racer's real speed, so a stall
        is a crawl. It cannot outrun the cap above, because it advances
        more slowly than the truth does.
      */
      const floor = prev + (truth - prevTruth) * 0.18;
      if (p < floor) p = floor;
      if (truth < 1 && p > 0.985) p = 0.985;     // never over the line early
      if (p < 0) p = 0;
      if (truth >= 1) p = 1;                     // the truth wins at the line

      shown[i][t] = p;
      prev = p;
      prevTruth = truth;
    }
  }

  events.sort((a, b) => a.ms - b.ms);
  return { shown, events };
}

const VERB = {
  surge:     (n) => `🔥 ${n} surges`,
  stumble:   (n) => `😬 ${n} stalls`,
  breakaway: (n) => `🚀 ${n} breaks away`,
  comeback:  (n) => `👀 ${n} is closing`,
  push:      (n) => `💨 ${n} makes a move`,
};

/**
 * The commentary. Real events and real positions only.
 *
 * There is no points data in an Arena event - it is a race, not a
 * scoreboard - so nothing here talks about swings or margins in points.
 * The gap at the line is in seconds, because seconds is what was measured.
 */
export function callouts(sim, shown, racers, events = []) {
  const n = shown.length;
  if (n < 2) return [];
  const out = [];
  const nameOf = (i) => racers[i]?.name || `Racer ${i + 1}`;

  for (const e of events) {
    const say = VERB[e.kind];
    if (say) out.push({ ms: e.ms, text: say(nameOf(e.racer)) });
  }

  // Lead changes, read off the drawing - what the viewer actually sees.
  let leader = -1;
  for (let t = 0; t <= sim.frames; t++) {
    let top = 0;
    for (let i = 1; i < n; i++) if (shown[i][t] > shown[top][t]) top = i;
    if (top !== leader) {
      if (leader >= 0 && shown[top][t] < 0.95) {
        out.push({ ms: t * TICK_MS, text: `⚔️ ${nameOf(top)} takes the lead`, strong: true });
      }
      leader = top;
    }
  }

  const first = sim.order[0], second = sim.order[1];
  if (first && second) {
    const gap = (second.finishMs - first.finishMs) / 1000;
    out.push({ ms: Math.max(0, first.finishMs - 1500), text: "🏁 Final push" });
    out.push({ ms: first.finishMs, strong: true,
      text: gap <= 0.25 ? `🏆 Photo finish — ${gap.toFixed(2)}s` : `🏆 ${nameOf(first.index)} wins` });
  }

  /*
    THINNED, NOT SPAMMED. Every line above is a real moment, but six of
    them inside four seconds is a wall of text rather than commentary. A
    lead change and the result always survive; anything else needs 2.5
    seconds of clear air.
  */
  out.sort((a, b) => a.ms - b.ms);
  const kept = [];
  let lastMs = -9999;
  for (const c of out) {
    if (c.strong || c.ms - lastMs >= 2500) { kept.push(c); lastMs = c.ms; }
  }
  return kept;
}

/* =====================================================================
   VISUAL EVENTS - computed ONCE, before a single frame is drawn.
   ---------------------------------------------------------------------
   The brief worried about per-frame pairwise comparison across twelve
   racers. It is not needed: `shown` is a finished recording by the time
   playback starts, so the entire race can be scanned in one pass here and
   the render loop only has to walk a sorted queue.

   That is the difference between O(n^2) sixty times a second forever and
   O(n^2) once over a few hundred ticks - and it means every effect has a
   known start, duration and intensity before anything animates.

   FOUR KINDS, all derived from real movement:

     jump   a racer gained 2+ places in a short window
     swap   the same pair traded places repeatedly - escalating
     near   two racers came within a whisker of each other
     (final-stretch intensity is not an event; it is a curve the renderer
      reads off progress, because it applies to everything at once)

   NOTHING HERE CAN CHANGE THE RACE. It only reads `shown`, which is
   already only the drawing, and returns a list of things to animate.
   ===================================================================== */

/** Ranking at one tick, from the drawn positions. */
function placesAt(shown, t) {
  const n = shown.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => shown[b][t] - shown[a][t]);
  const place = new Array(n);
  for (let p = 0; p < n; p++) place[idx[p]] = p;
  return place;
}

/** How close the nearest rival is, used for the near-miss sparks. */
const NEAR = 0.012;          // ~1% of the track
const JUMP_WINDOW = 25;      // ticks (~1s) over which a "jump" is measured

/**
 * Everything worth animating, in playback order.
 *
 * @returns {Array<{ms,kind,racer,other,places,intensity,durMs,text}>}
 */
export function visualEvents(sim, shown, racers) {
  const n = shown.length;
  if (n < 2) return [];
  const frames = sim.frames;
  const nameOf = (i) => racers[i]?.name || `Racer ${i + 1}`;
  const out = [];

  /* Sampled rather than every tick: a place cannot meaningfully change in
     40ms, and this keeps the whole scan to a few hundred iterations. */
  const STEP = 5;
  let prev = placesAt(shown, 0);
  const history = [{ t: 0, place: prev }];

  /* Pair bookkeeping for swap escalation and near-miss throttling. Keyed
     by the pair, so one close duel cannot spawn hundreds of effects. */
  const swaps = new Map();     // "a:b" -> { count, lastMs }
  const lastJump = new Array(n).fill(-9999);   // per racer
  /*
    GLOBAL COOLDOWNS, AND THEY ARE THE DIFFERENCE BETWEEN DRAMA AND NOISE.

    Twelve racers is 66 pairs. Throttling per pair looked reasonable and
    produced 556 events a race with 66 landing in a single second - every
    racer flashing constantly, which reads as a broken screen rather than
    a close race. The budget is now global: at most one near-miss and one
    duel beat in play at a time, and the CLOSEST pair wins the slot.
  */
  let lastNearMs = -9999, lastSwapMs = -9999;

  for (let t = STEP; t <= frames; t += STEP) {
    const place = placesAt(shown, t);
    const ms = t * TICK_MS;

    // ---- multi-position jumps ------------------------------------------
    const back = history.find((h) => t - h.t <= JUMP_WINDOW) || history[history.length - 1];
    for (let i = 0; i < n; i++) {
      const gained = back.place[i] - place[i];
      /* 2+ places, and only once the racer has settled there - measured
         against the window rather than the previous sample, so a single
         wobble across a boundary is not a "jump". */
      /*
        NOT OFF THE LINE. Everybody starts level, so the first couple of
        seconds are the field sorting itself out from a dead heat - which
        generated a burst of "+2" callouts at 0.2s that meant nothing.
        A jump has to happen in an established race to be a jump.
      */
      if (gained >= 2 && shown[i][t] > 0.12 && shown[i][t] < 0.97) {
        /* Per RACER, not "the last event pushed" - the first cut compared
           against whatever was most recently added, so two racers jumping
           in turn each cleared the other's cooldown. */
        if (ms - lastJump[i] > 3500) {
          lastJump[i] = ms;
          out.push({
            ms, kind: "jump", racer: i, places: gained,
            intensity: Math.min(1, gained / 4),
            durMs: 1200,
            text: place[i] === 0 ? `⚔️ ${nameOf(i)} takes the lead`
                                 : `⬆️ ${nameOf(i)} +${gained}`,
          });
        }
      }
    }

    // ---- rapid swaps, and the proximity that goes with them -------------
    let closest = { gap: Infinity, a: -1, b: -1 };
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const key = `${a}:${b}`;
        const swapped = (prev[a] < prev[b]) !== (place[a] < place[b]);
        if (swapped) {
          const rec = swaps.get(key) || { count: 0, lastMs: -9999 };
          /* Only count it as part of a RUN if it happened soon after the
             last one; otherwise the pair starts fresh. That is what makes
             a genuine back-and-forth escalate and two unrelated passes
             twenty seconds apart stay calm. */
          rec.count = ms - rec.lastMs < 4000 ? rec.count + 1 : 1;
          rec.lastMs = ms;
          swaps.set(key, rec);
          if (rec.count >= 2 && ms - lastSwapMs > 1500) {
            lastSwapMs = ms;
            out.push({
              ms, kind: "swap", racer: a, other: b,
              intensity: Math.min(1, rec.count / 4),
              durMs: 900,
            });
          }
        }

        // The closest pair at this sample, for the one near-miss slot.
        const gap = Math.abs(shown[a][t] - shown[b][t]);
        if (gap < NEAR && shown[a][t] < 0.97 && gap < closest.gap) closest = { gap, a, b };
      }
    }

    /* One spark at a time, for whichever pair is actually tightest. */
    if (closest.a >= 0 && ms - lastNearMs > 1200) {
      lastNearMs = ms;
      out.push({ ms, kind: "near", racer: closest.a, other: closest.b, intensity: 0.4, durMs: 600 });
    }

    prev = place;
    history.push({ t, place });
    if (history.length > 12) history.shift();
  }

  out.sort((a, b) => a.ms - b.ms);
  return out;
}

/**
 * How intense the presentation should be at a given moment, 0 to 1.
 *
 * A CURVE, NOT A SWITCH. The brief asked for the final stretch to ramp
 * rather than flip at a threshold, so this is a smooth rise across the
 * last 30% of the leader's progress. The renderer multiplies its effects
 * by it; nothing about the race changes, and the racers are not moving
 * any faster - it only looks like more is at stake, which by then it is.
 */
export function intensityAt(shown, t) {
  let lead = 0;
  for (let i = 0; i < shown.length; i++) if (shown[i][t] > lead) lead = shown[i][t];
  if (lead <= 0.7) return 0;
  const x = Math.min(1, (lead - 0.7) / 0.3);
  return x * x;                     // slow start, strong finish
}


/* =====================================================================
   THE LEADERBOARD, WORKED OUT IN ONE PLACE.
   ---------------------------------------------------------------------
   Both views used to sort their own board inline, with the same rules
   written twice - which is exactly how two screens end up disagreeing
   about who is third. There is one implementation now and both call it.

   THE RULE, and the second half is the part that matters:

     still running   ranked by the DRAWN position, so the board agrees
                     with what is on screen
     finished        pinned by OFFICIAL finishMs, because once a pack is
                     all sitting at 1.0 the drawn positions are level and
                     would sort arbitrarily - the board could contradict
                     the result in its final seconds

   Nothing here computes a time. finishMs comes from simulate(); this only
   decides the order to show them in and does the subtraction for the gap.
   ===================================================================== */
export function boardState(sim, shown, elapsedMs) {
  const src = shown || sim.samples;
  const n = src.length;
  const tick = Math.max(0, Math.min(sim.frames, Math.round(elapsedMs / TICK_MS)));
  const finish = new Array(n);
  for (const o of sim.order) finish[o.index] = o.finishMs;
  const winnerMs = sim.order[0]?.finishMs ?? 0;

  const rows = Array.from({ length: n }, (_, i) => ({
    index: i,
    finishMs: finish[i],
    done: elapsedMs >= finish[i],
    progress: src[i][tick],
  }));

  rows.sort((a, b) => {
    if (a.done && b.done) return a.finishMs - b.finishMs;
    if (a.done) return -1;
    if (b.done) return 1;
    return (b.progress - a.progress) || (a.index - b.index);
  });

  return rows.map((r, place) => {
    /*
      gap is a LOCAL, not a sibling property. Reading r.gapMs inside the
      same object literal that defines gapMs reads the ORIGINAL row, which
      has no such field - so every label came out "+NaN" while the numbers
      beside it were perfectly correct.
    */
    const gap = r.finishMs - winnerMs;
    return {
      ...r,
      place,
      gapMs: gap,
      /* The winner shows a time, everybody else the gap to them. */
      label: !r.done ? ""
        : gap === 0 ? `${(r.finishMs / 1000).toFixed(2)}s`
        : `+${(gap / 1000).toFixed(2)}`,
    };
  });
}
