import { Graphics } from "pixi.js";
import type { RaceFrame } from "./contracts";
import type { ArenaViewport } from "./viewport";
import { effectDensity, effectSample } from "./effects";

export function drawAnimeField(
  graphics: Graphics,
  frame: RaceFrame,
  viewport: ArenaViewport,
  reducedMotion: boolean,
): void {
  graphics.clear();
  if (frame.state !== "running" || reducedMotion) return;
  const count = effectDensity(frame.heat, viewport.compact, false);
  const bucket = Math.floor(frame.elapsedMs / (frame.heat >= 2 ? 72 : 105));
  for (let i = 0; i < count; i++) {
    const sample = effectSample(bucket, frame.heat, i);
    const x = sample.x * viewport.width;
    const y = sample.y * viewport.height;
    const peak = 0.55 + Math.sin((frame.elapsedMs + i * 83) * 0.006) * 0.28;
    const length = (24 + viewport.width * 0.09 * sample.length) * (0.7 + frame.heat * 0.22);
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({ color: i % 4 === 0 ? 0xffed9a : 0xffffff, width: sample.length > 0.72 ? 2.2 : 1.1, alpha: sample.alpha * peak * 0.2 });
  }
}

export function drawWinnerConvergence(graphics: Graphics, width: number, height: number, x: number, y: number, intensity: number): void {
  if (intensity <= 0.02) return;
  for (let i = 0; i < 12; i++) {
    const angle = i / 12 * Math.PI * 2;
    const outer = Math.max(width, height) * (0.38 + (i % 3) * 0.035);
    const inner = 45 + intensity * 35;
    graphics.moveTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
      .lineTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
      .stroke({ color: i % 2 ? 0xffd84a : 0xffffff, width: 2, alpha: intensity * 0.34 });
  }
}
