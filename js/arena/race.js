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
/* The arcs now carry the story, so this is only the jitter on top of them.
   It is barely raised; the variation comes from the arcs and from the much
   wider per-racer amplitude, not from multiplying this. */
const THEATRE = 0.175;

/*
  And a hard ceiling on how far the drawing may run ahead of the truth.

  Without it the monotonic clamp compounds: a racer pushed forward cannot
  come back, so peaks stack and the drawn position drifted up to 46% of
  the track from the real one - which is not drama, it is a racer parked
  at a standstill for ten seconds while the truth catches up. A fifth of
  the track is a place or two, which is the point, and it self-releases
  because the truth only ever moves forward.
*/
const MAX_LEAD = 0.46;

/*
  THE LAUNCH, and it is why the field used to appear a quarter of the way
  down the track on the first frame after GO.

  The theatre envelope above is `(1 - truth) ^ 1.35`, which is at its
  LARGEST at the start line, and each racer's wobble is two sine waves with
  a random phase. At tick zero the phase is ~0, so the wobble collapses to
  `sin(p1)*a1 + sin(p2)*a2` - a random constant per racer worth up to about
  1.9, which after `amp * THEATRE` is a fifth of the track and was then
  capped only by MAX_LEAD. Measured on real seeds: the truth at tick 0 is
  0.0034 for everybody, and the DRAWN position reached 0.2233. The race was
  never running early and no countdown time leaked into the clock; the very
  first drawn frame simply had the field smeared across the first quarter.

  So the theatre is now gated shut at the line and opens over the first few
  percent of the race, and the drawn position is eased in over the same
  window. Both are multipliers on the DRAWING. simulate() is not consulted,
  finishMs is untouched, and by LAUNCH_ZONE the drawing has merged back onto
  the truth - so the only thing that changed is that a race now starts from
  the start line and accelerates into it.
*/
const LAUNCH_ZONE = 0.07;

/** 0 on the start line, 1 once the field is properly away. */
function launchEase(truth) {
  if (truth >= LAUNCH_ZONE) return 1;
  const x = truth <= 0 ? 0 : truth / LAUNCH_ZONE;
  return x * x * (3 - 2 * x);        // smoothstep: zero slope at the line
}

/*
  THE CLOSE, and it is why a finish used to stutter.

  The old rule was `if (truth < 1 && p > 0.985) p = 0.985` - a hard ceiling
  that stopped the drawing from crossing early. It worked, and it froze
  every racer. Measured on seed 90210: the winner approached the line at
  0.0046 per tick, sat at exactly 0.985 for four ticks (160ms of dead
  stop), then moved 0.015 in a single tick - three times approach speed -
  and the post-finish coast then started from rest on top of that. That is
  the approach/stop/shoot sequence, and it was one line.

  A ceiling is the wrong instrument. What the invariant actually needs is
  for the DRAWING TO CONVERGE ON THE TRUTH before the line, and convergence
  is a multiplier, not a clamp: the theatre closes smoothly across the last
  tenth of the race, so by the line the drawn position IS the true position
  and there is nothing left to clamp. No ceiling, no freeze, no snap - and
  the same guarantee, more strongly, because it holds continuously rather
  than at one threshold.
*/
const CLOSE_FROM = 0.90;

/*
  HOW FAST THE THEATRE OPENS, which is not the same as how fast the racers
  leave the line.

  The launch gate reaches full inside 7% of the race - about eight tenths of
  a second - and the deviation was allowed to reach its full size just as
  fast. Measured: racers hit +0.34 of lead by tick 16, travelling at 0.05 of
  the track per tick against a normal 0.004, and then stopped dead against
  the cap. A twelvefold velocity change in one tick is the opposite of the
  smoothness this pass is for.

  The field now fans out over the first quarter of the race instead. Same
  eventual spread, no wall to hit.
*/
const OPEN_ZONE = 0.26;

function openEase(truth) {
  if (truth >= OPEN_ZONE) return 1;
  const x = truth <= 0 ? 0 : truth / OPEN_ZONE;
  return x * x * (3 - 2 * x);
}

/** 1 while the theatre is open, easing to 0 exactly at the line. */
function closingEase(truth) {
  if (truth >= 1) return 0;
  if (truth <= CLOSE_FROM) return 1;
  const x = (truth - CLOSE_FROM) / (1 - CLOSE_FROM);
  return 1 - x * x * (3 - 2 * x);
}

/* =====================================================================
   THE STORY ARCS.
   ---------------------------------------------------------------------
   The waves below make a race BUSY; they do not make it dramatic. Busy is
   twelve racers trading a place every second and the field never breaking
   up, which is what "too orderly" describes.

   An arc is a single long deviation - several seconds of it - shaped as a
   raised cosine so it has zero slope at both ends and therefore cannot
   produce a visible kink where it starts or stops. One racer pulling +0.16
   away over eight seconds is a BREAKAWAY. The same curve inverted is a
   COLLAPSE. Placed late and positive it is a LATE CHARGE; placed after a
   deficit it is a COMEBACK.

   Field compression needs no arc of its own: every arc is scaled by the
   closing ease above, so the whole field is drawn back onto the truth as
   the line approaches. The spread opens up and then squeezes shut, which
   is the shape a real race has.
   ===================================================================== */
const ARC_KINDS = ["breakaway", "collapse", "comeback", "latecharge"];

/** Zero slope at both ends: a bump that cannot kink where it begins. */
function arcShape(x) {
  if (x <= 0 || x >= 1) return 0;
  return 0.5 - 0.5 * Math.cos(x * Math.PI * 2);
}

/** The scripted moments. 3-5 a race, never more - constant chaos is noise. */
const KINDS = ["surge", "stumble", "breakaway", "comeback", "push"];

/**
 * Each racer's speed at the instant they cross, in progress per millisecond.
 *
 * Read off the authoritative samples either side of the finishing tick, so
 * it is the racer's REAL closing speed. The post-finish coast starts from
 * exactly this, which is what makes the crossing velocity-continuous rather
 * than a fresh animation from a standstill.
 */
export function crossingSpeeds(sim) {
  const finishOf = new Map(sim.order.map((o) => [o.index, o.finishMs]));
  return sim.samples.map((s, i) => {
    const finishMs = finishOf.get(i) ?? 0;
    const tick = Math.max(1, Math.min(sim.frames, Math.round(finishMs / TICK_MS)));
    /* Step back to the last pair of ticks that were still moving: at and
       after the line the samples are pinned to 1 and would read as zero. */
    let a = tick, b = tick - 1;
    while (a > 1 && s[a] - s[b] <= 0) { a--; b--; }
    const perTick = Math.max(1e-5, s[a] - s[b]);
    return perTick / TICK_MS;
  });
}

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
      /*
        WIDENED, AND PER RACER. This used to be 0.85-1.45, which is barely a
        spread at all: twelve racers all wobbling by about the same amount
        read as one organism. At 0.45-1.95 some racers are genuinely calm
        and others are all over the track, which is most of what makes a
        field look like twelve individuals rather than a peloton.
      */
      amp: 0.45 + rand() * 1.5,
    });
  }

  /*
    THE ARCS. One or two per racer, several seconds each.

    Placed in TRUTH space rather than tick space so a short race and a long
    race get the same shape. Windows are 0.16-0.34 of the race - at a
    medium length that is four to nine seconds, which is long enough to
    watch somebody go and long enough to watch it come apart.

    A breakaway goes to somebody near the front, a comeback to somebody
    near the back, so the arc agrees with where the racer actually is.
  */
  const arcs = Array.from({ length: n }, () => []);
  const arcCount = n <= 4 ? n : Math.round(n * 1.7);
  for (let k = 0; k < arcCount; k++) {
    const kind = ARC_KINDS[Math.floor(rand() * ARC_KINDS.length)];
    const width = 0.18 + rand() * 0.22;
    /* Late charges sit at the end; everything else spreads across the
       middle. Nothing starts before 8% - the launch owns the start. */
    const start = kind === "latecharge"
      ? 0.58 + rand() * 0.16
      : 0.08 + rand() * 0.52;

    let tick = 0;
    while (tick < frames && sim.samples[0][tick] < start) tick++;
    const standing = Array.from({ length: n }, (_, i) => i)
      .sort((a, b) => sim.samples[b][tick] - sim.samples[a][tick]);

    let racer;
    if (kind === "breakaway") racer = standing[Math.floor(rand() * Math.min(3, n))];
    else if (kind === "comeback" || kind === "latecharge") racer = standing[n - 1 - Math.floor(rand() * Math.min(4, n))];
    else racer = standing[Math.floor(rand() * n)];

    /* Two overlapping arcs on one racer would add into a single enormous
       deviation instead of reading as two moments. */
    if (arcs[racer].some((a) => start < a.start + a.width && a.start < start + width)) continue;

    const power = (kind === "collapse" ? -1 : 1) * (0.13 + rand() * 0.13);
    arcs[racer].push({ kind, start, width, power });
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
    const myArcs = arcs[i];
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

      /* Both terms are gated by the launch: the racer leaves the line from
         a standstill, and the theatre only opens once they are away. */
      const launch = launchEase(truth);
      const close = closingEase(truth);

      /*
        THE ARCS ARE ADDED IN PROGRESS, NOT IN WOBBLE UNITS.

        The wobble is a shape that gets multiplied by fade, which collapses
        it to nothing past about 80% - fine for jitter, useless for a story
        that is supposed to still be running in the last third. An arc is a
        deviation in its own right, scaled only by the launch and the close,
        so a late charge is still a late charge at 85% and is still folded
        away by the line.
      */
      let arc = 0;
      for (const a of myArcs) {
        arc += a.power * arcShape((truth - a.start) / a.width);
        const key = `${i}:${a.kind}:${a.start}`;
        if (!stamped.has(key) && truth >= a.start + a.width * 0.32) {
          stamped.add(key);
          events.push({ kind: a.kind === "collapse" ? "stumble" : a.kind, racer: i,
                        ms: t * TICK_MS, durMs: 1600 });
        }
      }

      /*
        SATURATED, NOT CLAMPED.

        A hard clamp is a wall: a racer accelerating into it stops in a
        single tick. tanh approaches the same limit asymptotically, so the
        deviation slows as it nears the allowance and the velocity stays
        continuous - and because tanh is strictly less than 1, the bound
        holds just as absolutely as the clamp did.
      */
      const allow = Math.min(MAX_LEAD, (1 - truth) * 0.85);
      const raw = (wob * w.amp * THEATRE * fade + arc) * launch * close * openEase(truth);
      const dev = allow > 1e-6 ? allow * Math.tanh(raw / allow) : 0;
      let p = truth * launch + dev;

      /*
        ORDER MATTERS HERE, AND GETTING IT WRONG COST BOTH INVARIANTS.

        The floor stops a stalling racer from freezing; the cap stops the
        drawing reaching the line early. The first version applied the cap
        and THEN the floor, which let the floor win - and the floor is a
        ratchet, because it is computed from the previous DRAWN position.
        Past 60% the cap rises at 0.15 per unit of truth while the floor
        rises at 0.30, so a racer pinned to the cap climbed straight
        through it: measured at 692 early crossings over 40 races, one
        racer drawn at 1.0007 while its true progress was 0.93. The
        `truth >= 1` rule then yanked it back to 1.0, which is where the 49
        backwards steps came from - the same bug twice.

        Floor first, cap last. The cap is monotonically increasing
        (truth + 0.34 below 60%, then 0.85 + 0.15 * truth, equal at the
        join), so clamping to it can never pull a racer behind where they
        were, and nothing can outrun it. Both invariants now hold by
        construction rather than by tuning.
      */
      const floor = prev + (truth - prevTruth) * 0.30;
      if (p < floor) p = floor;
      if (p < 0) p = 0;

      /* The saturation above already holds this; it stays as the hard
         guarantee, because the floor is applied between the two. */
      if (p > truth + allow) p = truth + allow;
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
   THE FINISH, AFTER THE FINISH.
   ---------------------------------------------------------------------
   Crossing the line is decided by simulate(); what a racer does in the two
   seconds AFTER crossing is decided here, and it is drawing only.

   WHY IT WAS A PILE-UP. The shared adapter moved every finisher to
   `1 + smoothstep(age / 360ms) * 0.2` - the same number for all twelve, so
   a second after the last finish all twelve display positions were
   identical (measured: twelve racers, one distinct X). Everybody parked on
   the same coordinate, which is the traffic jam.

   WHAT REPLACES IT. Each racer coasts past the line and decelerates into a
   parking spot that belongs to their PLACE: the winner runs furthest on,
   and every place behind them settles a little shorter. The offsets are
   deliberately small because of how the finish camera projects the last
   stretch - see settleOffset - and lanes already separate the field
   vertically, so nothing overlaps.

   NOTHING HERE MOVES A FINISH TIME. `finishMs` decides when the coast
   STARTS; the coast only decides where the racer stands afterwards.
   ===================================================================== */

/** Roughly how long a finisher takes to wind down. See coastProgress. */
export const COAST_MS = 1100;

/*
  How far past the line each place parks, in progress units.

  Bigger than they were, because the projection under them changed. These
  used to be ~0.03 and had to be: the old finish camera expanded the last
  stretch across the screen, so one unit of progress was about 4.3 screen
  widths. The mapping is linear now with a real run-off strip after the
  line (see finish-presentation.ts), so a progress unit is a progress unit
  and these are honest distances again.

  First runs furthest on, and every place behind settles a little shorter.
*/
export const MAX_SETTLE = 0.16;

export function settleOffset(place) {
  const rank = Math.max(1, place || 1);
  return Math.max(0.04, MAX_SETTLE - (rank - 1) * 0.011);
}

/**
 * Where a finished racer is DRAWN, given their official finish time.
 *
 * CONTINUOUS IN POSITION AND IN VELOCITY, which is the whole point.
 *
 * The old curve was `1 + settle * (1 - (1-x)^3)` on a fixed 900ms. Its
 * position was continuous - it starts at exactly 1 - but its VELOCITY was
 * not: it began at whatever `3 * settle / 900ms` happened to be, unrelated
 * to how fast the racer was actually travelling. A racer who had just been
 * clamped to a standstill by the old 0.985 shelf therefore stopped, and
 * then a fresh animation launched them forward from rest.
 *
 * This is an exponential decay whose INITIAL velocity is the racer's real
 * crossing speed and whose total travel is exactly the settle distance:
 *
 *   x(age) = 1 + S * (1 - e^(-age * v0 / S))
 *   x'(0)  = S * (v0 / S) = v0        <- matches the approach exactly
 *   x(inf) = 1 + S                    <- the deterministic parking spot
 *
 * So the racer carries their momentum through the line and bleeds it off
 * smoothly. Nothing about `finishMs` moves; this only decides where they
 * are standing afterwards.
 *
 * @param {number} crossSpeed  progress per ms at the line, from crossingSpeeds()
 */
export function coastProgress(progress, elapsedMs, finishMs, place, crossSpeed) {
  if (finishMs == null || elapsedMs < finishMs) return progress;
  const age = Math.max(0, elapsedMs - finishMs);
  const settle = settleOffset(place);
  const v0 = Math.max(1e-6, crossSpeed || settle / COAST_MS);
  return 1 + settle * (1 - Math.exp(-age * v0 / settle));
}

/** How long that decay takes to become imperceptible, for this racer. */
export function coastDurationMs(place, crossSpeed) {
  const settle = settleOffset(place);
  const v0 = Math.max(1e-6, crossSpeed || settle / COAST_MS);
  return Math.min(4000, (settle / v0) * 4);      // four time constants
}

/**
 * Apply the whole finish presentation to one renderer frame, in place.
 *
 * ONE IMPLEMENTATION, TWO VIEWS. The Arena stage and the shared broadcast
 * were each doing this inline with their own copy of the same six lines,
 * which is precisely how the two of them drift. Both call this now, so a
 * change to how a finisher coasts, winds down or parks lands in both
 * places or in neither.
 *
 * Mutates and returns `frame` - it is a per-racer object the caller has
 * just built and is about to hand to the renderer, so there is nothing to
 * gain from allocating a second one sixty times a second.
 */
export function presentFinish(frame, { elapsedMs, finishMs, place, crossSpeed, celebrating }) {
  const coastMs = coastDurationMs(place, crossSpeed);
  const phase = finishPhase(elapsedMs, finishMs, celebrating, coastMs);
  frame.phase = phase;
  frame.displayProgress = coastProgress(frame.progress, elapsedMs, finishMs, place, crossSpeed);
  frame.exiting = phase === "crossing" || phase === "coasting";
  if (frame.exiting) {
    /* Winding down from the speed they actually crossed at, on the same
       decay curve as the position - so the legs slow as the racer slows. */
    const age = elapsedMs - finishMs;
    const settle = settleOffset(place);
    const v0 = Math.max(1e-6, crossSpeed || settle / COAST_MS);
    frame.speed = Math.max(0, Math.min(1, (v0 * Math.exp(-age * v0 / settle)) * 180));
  }
  return frame;
}

/** RACING -> CROSSING -> COASTING -> SETTLED -> CELEBRATING. */
export function finishPhase(elapsedMs, finishMs, celebrating, coastMs = COAST_MS) {
  if (finishMs == null || elapsedMs < finishMs) return "racing";
  const age = elapsedMs - finishMs;
  if (celebrating) return "celebrating";
  if (age < 140) return "crossing";
  if (age < coastMs) return "coasting";
  return "settled";
}

/* =====================================================================
   THE SHOT. A 2D camera, chosen once per frame.
   ---------------------------------------------------------------------
   The Arena is a flat 2D race and stays one. This picks WHICH framing the
   wrapper should be wearing; the CSS does the rest with a transform on the
   track, so no racer's progress is touched by any of it.

   Deliberately few states, and each one has to earn its place: a camera
   that changes every second is not dramatic, it is unwatchable.
   ===================================================================== */
/*
  THREE STATES, DOWN FROM FIVE.

  The launch push and the ground-level hold on a lead change are gone. A
  camera that moves whenever anything happens competes with the racers for
  the eye, and the racers are the thing worth watching. What is left is a
  stable shot for four fifths of the race, a barely-there tightening as the
  leader reaches the last stretch, and a small push for the arrivals.
*/
export function raceShot({ leaderProgress, celebrating }) {
  if (celebrating) return "finish";
  if (leaderProgress >= 0.80) return "final";
  return "wide";
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
