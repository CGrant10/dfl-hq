import type { RaceState } from "./contracts";

export interface BackgroundMotion {
  blurX: number;
  blurY: number;
  intensity: number;
}

export function backgroundMotion(state: RaceState, heat: number, finishing = false): BackgroundMotion {
  if (state !== "running") return { blurX: 0, blurY: 0, intensity: 0 };
  const safeHeat = Math.max(0, Math.min(1, heat));
  const finishEase = finishing ? 0.45 : 1;
  return {
    blurX: (0.35 + safeHeat * 3.2) * finishEase,
    blurY: 0.08,
    intensity: safeHeat * finishEase,
  };
}
