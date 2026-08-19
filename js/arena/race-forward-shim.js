// Arena novelty-race compatibility shim.
// Re-export the existing utilities, but own the actual race movement and the
// finish run-through here. Nothing in legacy theatre may reposition a racer.
export * from "./race.js?legacy=1";

import { simulateForwardRace } from "./duck-physics.js";

export function simulate(racers, ticks, seed) {
  return simulateForwardRace(racers, ticks, seed);
}

export function dramatize(sim) {
  return { shown: sim.samples, events: [] };
}

/*
  RUN THROUGH THE LINE.

  The legacy finish helper ramps the exit over 600ms. Even though that curve
  never mathematically decelerates, the course camera stops at the finish, so
  losing the background's apparent motion makes that gentle ramp LOOK like a
  slowdown on a phone. Novelty races should read the opposite way: hit stripe,
  keep blasting, disappear.

  Start the off-screen leg immediately at 3x crossing pace. There is no settle,
  no ease, no parking and no finish-state brake. The racer is clipped naturally
  after leaving the viewport. `progress` is untouched before the official
  crossing, so this cannot change place or finish time.
*/
export function presentFinish(racerFrame, elapsedMs, trajectory, celebrating = false) {
  if (!racerFrame) return racerFrame;
  if (!trajectory || elapsedMs < trajectory.finishMs) {
    racerFrame.displayProgress = racerFrame.progress;
    racerFrame.phase = "racing";
    return racerFrame;
  }
  const age = Math.max(0, elapsedMs - trajectory.finishMs);
  const crossSpeed = Math.max(0.000001, Number(trajectory.crossSpeed) || 0.0001);
  racerFrame.displayProgress = 1 + age * crossSpeed * 3;
  racerFrame.phase = celebrating ? "celebrating" : "coasting";
  return racerFrame;
}
