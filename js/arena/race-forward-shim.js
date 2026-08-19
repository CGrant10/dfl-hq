// Arena forward-physics compatibility shim.
// Re-export every existing race helper, but make the shared simulation and
// presentation position track use the forward-only novelty-race model.
export * from "./race.js?legacy=1";

import { simulateForwardRace } from "./duck-physics.js";

export function simulate(racers, ticks, seed) {
  return simulateForwardRace(racers, ticks, seed);
}

// No second position truth. Reactions can be rebuilt later from velocity if
// wanted, but nothing is allowed to move a racer away from the actual samples.
export function dramatize(sim) {
  return { shown: sim.samples, events: [] };
}
