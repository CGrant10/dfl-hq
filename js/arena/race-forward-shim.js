// Arena novelty-race compatibility shim.
// Re-export the existing utilities, but own the actual race movement and the
// finish run-through here. Nothing in legacy theatre may reposition a racer.
export * from "./race.js?legacy=1";

import { simulateForwardRace } from "./duck-physics.js";

/*
  DURATION MEANS WATCH TIME.

  The story-race model deliberately allows 2x-3.6x surges. Feeding the old
  nominal tick count straight into that model made a 1500-tick (~60 second)
  configuration finish in roughly ten seconds because the winner spent much
  of the race above baseline pace. Keep the drama, but give it a longer
  internal course so the configured duration once again approximates the time
  a viewer watches before P1 crosses.

  Six is empirical calibration against the current story bands. It does not
  change relative racer behavior, order, seed determinism, or post-P1 clear;
  it only maps the human-facing duration onto the faster dramatic physics.
*/
const STORY_TIME_CALIBRATION = 6;

export function simulate(racers, ticks, seed) {
  const calibratedTicks = Math.max(1, Math.round((Number(ticks) || 1) * STORY_TIME_CALIBRATION));
  return simulateForwardRace(racers, calibratedTicks, seed);
}

export function dramatize(sim) {
  return { shown: sim.samples, events: [] };
}

/* Keep result presentation on an overlay plane, but never over the controls. */
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

/* Run through the line without any finish-state brake. */
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
