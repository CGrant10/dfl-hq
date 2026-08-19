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

/* The cinematic stylesheet accidentally re-declared the winner as relative,
   which made it become a fourth grid row and physically shove the race upward.
   Keep result presentation on the same overlay plane as the countdown. */
if (typeof document !== "undefined" && !document.getElementById("arena-novelty-overrides")) {
  const style = document.createElement("style");
  style.id = "arena-novelty-overrides";
  style.textContent = `
    .bc-stage.cinematic-race .bc-winner {
      position: absolute !important;
      inset: 0 !important;
      z-index: 12 !important;
      margin: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

/*
  RUN THROUGH THE LINE.

  Before the line, the simulation owns position. At the exact crossing we
  immediately continue at a deliberately strong screen-readable run-out pace.
  There is no ease, settle, parking, or finish-state brake. The initial step
  starts from the racer's actual crossing speed, multiplied only because the
  course camera stops and a literal race-space speed reads as slow motion on a
  phone once the background no longer moves.
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
  racerFrame.displayProgress = 1 + age * crossSpeed * 6;
  racerFrame.phase = celebrating ? "celebrating" : "coasting";
  return racerFrame;
}
