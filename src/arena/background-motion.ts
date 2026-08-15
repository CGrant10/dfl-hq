import type { RaceState } from "./contracts";

export interface BackgroundMotion {
  blurX: number;
  blurY: number;
  intensity: number;
}

export function backgroundMotion(state: RaceState, heat: number, finishing = false, reducedMotion = false): BackgroundMotion {
  if (state !== "running") return { blurX: 0, blurY: 0, intensity: 0 };
  const safeHeat = Math.max(0, Math.min(1, heat));
  const finishEase = finishing ? 0.62 : 1;
  const easedHeat = 1 - (1 - safeHeat) ** 2;
  const motionScale = reducedMotion ? 0.26 : 1;
  return {
    // Keep the subject plane sharp while the scenery receives a genuinely
    // directional smear. The SVG filter consumes these as X/Y deviations.
    blurX: (1.6 + easedHeat * 14.2) * finishEase * motionScale,
    blurY: reducedMotion ? 0.04 : 0.12,
    intensity: easedHeat * finishEase * (reducedMotion ? 0.34 : 1),
  };
}
