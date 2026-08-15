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
  const heat = Math.max(0.16, Math.min(1, frame.heat / 3));
  const bucket = Math.floor(frame.elapsedMs / (frame.heat >= 2 ? 48 : 72));
  const palette = [0xffffff, 0xbfeaff, 0x72d8ff, 0xffda6a, 0xff8a4c, 0x73f1c0];

  // The subject plane remains untouched; this translucent velocity grade
  // pushes the scenery back so crisp racers separate from a darker world.
  graphics.rect(0, 0, viewport.width, viewport.height)
    .fill({ color: 0x061525, alpha: 0.06 + heat * 0.2 });

  // Broad, transparent smears sit behind the racers and make the environment
  // read as a rushing field rather than a static illustration with a few lines.
  const bands = viewport.compact ? 5 : 8;
  for (let i = 0; i < bands; i++) {
    const sample = effectSample(bucket - 1, frame.heat + 23, i);
    const y = (0.08 + sample.y * 0.84) * viewport.height;
    const length = viewport.width * (0.28 + sample.length * 0.46);
    const x = viewport.width * (0.35 + sample.x * 0.9);
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({
        color: palette[(i + frame.heat) % palette.length]!,
        width: 8 + sample.length * (13 + heat * 12),
        alpha: (0.055 + sample.alpha * 0.1) * (0.7 + heat),
        cap: "round",
      });
  }

  for (let i = 0; i < count; i++) {
    const sample = effectSample(bucket, frame.heat, i);
    const drift = (frame.elapsedMs * (0.22 + heat * 0.42) + i * 37) % (viewport.width * 1.4);
    const x = viewport.width * 1.15 - drift + sample.x * viewport.width * 0.38;
    const y = sample.y * viewport.height;
    const peak = 0.72 + Math.sin((frame.elapsedMs + i * 83) * 0.008) * 0.22;
    const length = viewport.width * (0.1 + sample.length * (0.17 + heat * 0.22));
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({
        color: palette[(i * 3 + frame.heat) % palette.length]!,
        width: sample.length > 0.78 ? 5.4 : sample.length > 0.55 ? 2.8 : 1.35,
        alpha: sample.alpha * peak * (0.18 + heat * 0.32),
        cap: "round",
      });
  }
}

export function drawForegroundRush(
  graphics: Graphics,
  frame: RaceFrame,
  viewport: ArenaViewport,
  reducedMotion: boolean,
): void {
  graphics.clear();
  if (frame.state !== "running" || reducedMotion) return;
  const heat = Math.max(0, Math.min(1, frame.heat / 3));
  const count = Math.round((viewport.compact ? 4 : 7) + heat * 7);
  const bucket = Math.floor(frame.elapsedMs / 38);
  for (let i = 0; i < count; i++) {
    const sample = effectSample(bucket, 91 + frame.heat, i);
    const x = sample.x * viewport.width * 1.2;
    const y = sample.y * viewport.height;
    const length = viewport.width * (0.12 + sample.length * 0.22) * (0.7 + heat * 0.6);
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({
        color: i % 3 === 0 ? 0xfff0ac : 0xffffff,
        width: sample.length > 0.72 ? 3.2 : 1.25,
        alpha: sample.alpha * (0.12 + heat * 0.25),
        cap: "round",
      });
  }
}

export function drawWinnerConvergence(graphics: Graphics, width: number, height: number, x: number, y: number, intensity: number): void {
  graphics.clear();
  if (intensity <= 0.02) return;
  graphics.rect(0, 0, width, height).fill({ color: 0x020711, alpha: 0.34 + intensity * 0.28 });
  const max = Math.max(width, height);
  graphics.circle(x, y, 54 + intensity * 54).fill({ color: 0xffc928, alpha: intensity * 0.14 });
  graphics.circle(x, y, 34 + intensity * 30).fill({ color: 0xffffff, alpha: intensity * 0.08 });
  for (let i = 0; i < 36; i++) {
    const angle = i / 36 * Math.PI * 2;
    const outer = max * (0.48 + (i % 5) * 0.055);
    const inner = 38 + intensity * (42 + (i % 4) * 8);
    graphics.moveTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer)
      .lineTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner)
      .stroke({
        color: i % 4 === 0 ? 0xffffff : i % 2 ? 0xffd84a : 0xffa91f,
        width: i % 4 === 0 ? 4.5 : 1.6 + (i % 3),
        alpha: intensity * (i % 4 === 0 ? 0.7 : 0.42),
      });
  }
  for (let i = 0; i < 22; i++) {
    const sample = effectSample(Math.floor(intensity * 100), 404, i);
    const angle = sample.x * Math.PI * 2;
    const distance = 62 + sample.y * max * 0.28;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    graphics.circle(px, py, 1.2 + sample.length * 2.8)
      .fill({ color: i % 3 ? 0xffd84a : 0xffffff, alpha: intensity * sample.alpha * 0.72 });
  }
}
