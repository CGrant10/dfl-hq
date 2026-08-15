import { Graphics } from "pixi.js";
import type { MotionPose } from "./animation";
import { effectSample } from "./effects";

export interface RacerEffectInput {
  graphics: Graphics;
  pose: MotionPose;
  elapsedMs: number;
  variant: number;
  color: number;
  heat: number;
  speed: number;
  acceleration: number;
  active: boolean;
  reducedMotion: boolean;
}

/** Procedural transparent effects only—no rectangular particle textures. */
export function drawRacerEffects(input: RacerEffectInput): void {
  const { graphics, pose, elapsedMs, variant, color } = input;
  graphics.clear();
  if (!input.active || input.reducedMotion) return;

  const heat = Math.max(0, Math.min(1, input.heat / 3));
  const speed = Math.max(0, Math.min(1, input.speed));
  const acceleration = Math.max(0, Math.min(1, input.acceleration));
  const trail = Math.max(pose.afterimage, pose.energy * 0.9, heat * (0.28 + speed * 0.35));

  if (trail > 0.05) {
    // Layered, color-specific acceleration light. The broad pass is faint;
    // narrow cores stay bright and never soften the racer artwork itself.
    for (let i = 0; i < 7; i++) {
      const y = -19 + i * 6.5;
      const length = 34 + trail * (88 + i * 14) + acceleration * 54;
      const wobble = Math.sin(elapsedMs * 0.02 + i * 1.7 + variant * 8) * 1.8;
      graphics.moveTo(-13, y).lineTo(-13 - length, y + wobble)
        .stroke({ color, width: 9.5 - i * 0.82, alpha: trail * (0.2 - i * 0.014), cap: "round" });
      graphics.moveTo(-16, y).lineTo(-18 - length * 0.82, y + wobble * 0.55)
        .stroke({ color: i % 3 === 0 ? 0xffffff : color, width: i % 3 === 0 ? 2.2 : 3.2, alpha: trail * (0.68 - i * 0.052), cap: "round" });
    }

    // Three separated ghosts make a surge read as a burst, not a speed tweak.
    if (pose.afterimage > 0.18) {
      for (let ghost = 1; ghost <= 3; ghost++) {
        const gx = -22 - ghost * (18 + pose.afterimage * 13);
        const alpha = pose.afterimage * (0.36 - ghost * 0.062);
        graphics.roundRect(gx - 15, -18 + ghost, 24, 32, 7)
          .stroke({ color, width: 3.2, alpha });
        graphics.circle(gx + 2, -11 + ghost, 6.5)
          .stroke({ color: 0xffffff, width: 1.4, alpha: alpha * 0.8 });
      }
    }
  }

  if (pose.skid > 0.05) {
    graphics.moveTo(-8, 19).lineTo(-18 - pose.skid * 34, 21)
      .stroke({ color: 0xf5e7c8, width: 2.2, alpha: pose.skid * 0.72 });
    graphics.moveTo(-3, 22).lineTo(-12 - pose.skid * 24, 24)
      .stroke({ color: 0x9b825f, width: 1.4, alpha: pose.skid * 0.62 });
  }

  if (pose.dust > 0.08) {
    const bucket = Math.floor(elapsedMs / 58);
    const dustCount = pose.dust > 0.62 ? 11 : 7;
    for (let i = 0; i < dustCount; i++) {
      const sample = effectSample(bucket, Math.floor(variant * 17), i);
      const radius = 3.2 + sample.length * (5.2 + pose.dust * 4.4);
      const dx = -20 - sample.x * (34 + pose.dust * 34);
      const dy = 15 + sample.y * 10 - radius * 0.2;
      graphics.circle(dx, dy, radius)
        .fill({ color: i % 4 === 0 ? 0xffffff : 0xd7c7a4, alpha: pose.dust * sample.alpha * (0.28 + (i % 3) * 0.075) });
      if (i % 3 === 0) graphics.circle(dx, dy, radius * 1.35)
        .stroke({ color: 0xf5e7c8, width: 1, alpha: pose.dust * sample.alpha * 0.16 });
    }

    // Ground sparks and small directional debris make contact feel physical.
    for (let i = 0; i < 6; i++) {
      const sample = effectSample(bucket, Math.floor(variant * 31) + 7, i);
      const sx = -16 - sample.x * 46;
      const sy = 18 + sample.y * 7;
      graphics.moveTo(sx, sy).lineTo(sx - 5 - sample.length * 12, sy - 2 - sample.y * 7)
        .stroke({ color: i % 2 ? 0xffc44d : 0xffffff, width: 1.1 + sample.length, alpha: pose.dust * sample.alpha * 0.62 });
    }
  }

  if (pose.impact > 0.06) {
    const radius = 20 + pose.impact * 28;
    graphics.circle(0, 0, radius).stroke({ color, width: 3.4, alpha: pose.impact * 0.62 });
    graphics.circle(0, 0, radius * 0.62).stroke({ color: 0xffffff, width: 2, alpha: pose.impact * 0.54 });
    for (let i = 0; i < 14; i++) {
      const angle = i / 14 * Math.PI * 2 + variant;
      const inner = 12 + (i % 2) * 4;
      const outer = 31 + pose.impact * (16 + (i % 4) * 5);
      graphics.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .stroke({ color: i % 2 ? color : 0xffffff, width: i % 3 === 0 ? 2.8 : 1.4, alpha: pose.impact * 0.72 });
    }
  }
}
