import { Graphics, Text } from "pixi.js";
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
  if (frame.state !== "running") return;
  const finishBoost = frame.finish?.camera.mix ?? 0;
  const count = effectDensity(frame.heat, viewport.compact, reducedMotion)
    + Math.round(finishBoost * (reducedMotion ? 3 : viewport.compact ? 7 : 12));
  const effectScale = reducedMotion ? 0.34 : 1;
  const heat = Math.max(0.16, Math.min(1, frame.heat / 3));
  const bucket = Math.floor(frame.elapsedMs / (frame.heat >= 2 ? 48 : 72));
  const palette = [0xffffff, 0xbfeaff, 0x72d8ff, 0xffda6a, 0xff8a4c, 0x73f1c0];

  // The subject plane remains untouched; this translucent velocity grade
  // pushes the scenery back so crisp racers separate from a darker world.
  graphics.rect(0, 0, viewport.width, viewport.height)
    .fill({ color: 0x061525, alpha: (0.06 + heat * 0.2) * effectScale });

  // Broad, transparent smears sit behind the racers and make the environment
  // read as a rushing field rather than a static illustration with a few lines.
  const bands = (reducedMotion ? 2 : viewport.compact ? 5 : 8) + Math.round(finishBoost * (reducedMotion ? 1 : 4));
  for (let i = 0; i < bands; i++) {
    const sample = effectSample(bucket - 1, frame.heat + 23, i);
    const y = (0.08 + sample.y * 0.84) * viewport.height;
    const length = viewport.width * (0.28 + sample.length * (0.46 + finishBoost * 0.18));
    const x = viewport.width * (0.35 + sample.x * 0.9);
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({
        color: palette[(i + frame.heat) % palette.length]!,
        width: 8 + sample.length * (13 + heat * 12),
        alpha: (0.055 + sample.alpha * 0.1) * (0.7 + heat) * effectScale,
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
        alpha: sample.alpha * peak * (0.18 + heat * 0.32) * effectScale,
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
  if (frame.state !== "running") return;
  const heat = Math.max(0, Math.min(1, frame.heat / 3));
  const finishBoost = frame.finish?.camera.mix ?? 0;
  const effectScale = reducedMotion ? 0.26 : 1;
  const count = Math.max(1, Math.round(((viewport.compact ? 4 : 7) + heat * 7 + finishBoost * 7) * effectScale));
  const bucket = Math.floor(frame.elapsedMs / 38);
  for (let i = 0; i < count; i++) {
    const sample = effectSample(bucket, 91 + frame.heat, i);
    const x = sample.x * viewport.width * 1.2;
    const y = sample.y * viewport.height;
    const length = viewport.width * (0.12 + sample.length * (0.22 + finishBoost * 0.12)) * (0.7 + heat * 0.6);
    graphics.moveTo(x, y).lineTo(x - length, y)
      .stroke({
        color: i % 3 === 0 ? 0xfff0ac : 0xffffff,
        width: sample.length > 0.72 ? 3.2 : 1.25,
        alpha: sample.alpha * (0.12 + heat * 0.25) * effectScale,
        cap: "round",
      });
  }
}

export function drawPhotoFinish(graphics: Graphics, label: Text, frame: RaceFrame, viewport: ArenaViewport, reducedMotion: boolean): void {
  graphics.clear();
  label.visible = false;
  const photo = frame.finish?.photoFinish;
  if (!photo) return;
  const finishX = viewport.width * (frame.finish?.camera.finishRatio ?? 0.76);
  const flashScale = reducedMotion ? 0.35 : 1;
  graphics.rect(finishX - 1.5, 0, 3, viewport.height)
    .fill({ color: 0xffffff, alpha: photo.phase === "flash" ? 0.95 * flashScale : 0.42 * flashScale });
  if (photo.phase === "flash") {
    graphics.rect(0, 0, viewport.width, viewport.height)
      .fill({ color: 0xffffff, alpha: 0.68 * flashScale });
  }
  if (photo.phase === "approach") {
    label.text = "PHOTO FINISH";
    label.position.set(viewport.width * 0.5, viewport.height * 0.08);
    label.visible = true;
    label.alpha = 0.88;
    return;
  }
  if (photo.phase === "result") {
    const panelWidth = Math.min(470, viewport.width * 0.9);
    const panelHeight = viewport.compact ? 94 : 112;
    const x = (viewport.width - panelWidth) / 2;
    const y = viewport.height * 0.06;
    graphics.roundRect(x, y, panelWidth, panelHeight, 12)
      .fill({ color: 0x06111f, alpha: 0.86 })
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.32 });
    label.text = `PHOTO FINISH\n1 — ${photo.firstName} — ${(photo.firstMs / 1000).toFixed(2)}s\n2 — ${photo.secondName} — ${(photo.secondMs / 1000).toFixed(2)}s\nGAP — ${(photo.gapMs / 1000).toFixed(2)}s`;
    label.position.set(viewport.width * 0.5, y + panelHeight / 2);
    label.visible = true;
    label.alpha = 1;
  }
}

export function drawWinnerConvergence(graphics: Graphics, width: number, height: number, x: number, y: number, intensity: number, elapsedMs: number, reducedMotion = false): void {
  graphics.clear();
  if (intensity <= 0.02) return;
  if (reducedMotion) intensity *= 0.48;
  graphics.rect(0, 0, width, height).fill({ color: 0x020711, alpha: 0.34 + intensity * 0.28 });
  const max = Math.max(width, height);
  graphics.circle(x, y, 54 + intensity * 54).fill({ color: 0xffc928, alpha: intensity * 0.14 });
  graphics.circle(x, y, 34 + intensity * 30).fill({ color: 0xffffff, alpha: intensity * 0.08 });
  // Procedural tapered wedges have transparent space around every ray. There
  // is no rotating bitmap, filter rectangle, or clipped conic-gradient edge.
  const rayCount = reducedMotion ? 18 : 36;
  const rotation = elapsedMs * (reducedMotion ? 0.000035 : 0.000075);
  for (let i = 0; i < rayCount; i++) {
    const angle = i / rayCount * Math.PI * 2 + rotation;
    const outer = max * (0.48 + (i % 5) * 0.055);
    const inner = 38 + intensity * (42 + (i % 4) * 8);
    const half = 0.006 + (i % 4) * 0.0025;
    const innerHalf = half * 0.22;
    graphics.poly([
      x + Math.cos(angle - innerHalf) * inner, y + Math.sin(angle - innerHalf) * inner,
      x + Math.cos(angle - half) * outer, y + Math.sin(angle - half) * outer,
      x + Math.cos(angle + half) * outer, y + Math.sin(angle + half) * outer,
      x + Math.cos(angle + innerHalf) * inner, y + Math.sin(angle + innerHalf) * inner,
    ]).fill({
      color: i % 4 === 0 ? 0xffffff : i % 2 ? 0xffd84a : 0xffa91f,
      alpha: intensity * (i % 4 === 0 ? 0.38 : 0.22),
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
