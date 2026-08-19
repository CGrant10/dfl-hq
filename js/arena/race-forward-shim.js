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

/* Keep result presentation on an overlay plane, but never over the controls.
   A later cinematic selector used to turn both the winner and the control bar
   back into relative grid children. The winner shoved the race upward and then
   sat above the buttons. Lock both layers to their intended jobs here. */
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
    .bc-stage.cinematic-race .bc-bar {
      position: fixed !important;
      z-index: 30 !important;
    }
  `;
  document.head.appendChild(style);
}

/*
  RUN THROUGH THE LINE.

  Before the line, the simulation owns position. At the exact crossing we
  immediately continue at a deliberately strong screen-readable run-out pace.
  There is no ease, settle, parking, or finish-state brake.

  7.5x is intentionally only a small step up from the previous 6x. The race
  itself finally feels right, so this is not another physics rewrite; it just
  shortens the visible moment a finished racer spends near the stripe.
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
  racerFrame.displayProgress = 1 + age * crossSpeed * 7.5;
  racerFrame.phase = celebrating ? "celebrating" : "coasting";
  return racerFrame;
}
