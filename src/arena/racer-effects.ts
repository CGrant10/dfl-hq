import { Graphics } from "pixi.js";
import type { MotionPose } from "./animation";
import { effectSample } from "./effects";

export interface RacerEffectInput {
  graphics: Graphics;
  pose: MotionPose;
  elapsedMs: number;
  variant: number;
  color: number;
  active: boolean;
  reducedMotion: boolean;
}

/** Procedural transparent effects only—no rectangular particle textures. */
export function drawRacerEffects(input: RacerEffectInput): void {
  const { graphics, pose, elapsedMs, variant, color } = input;
  graphics.clear();
  if (!input.active || input.reducedMotion) return;

  if (pose.afterimage > 0.06) {
    for (let i = 0; i < 4; i++) {
      const y = -14 + i * 9;
      const length = 16 + pose.afterimage * (22 + i * 4);
      graphics.moveTo(-18, y).lineTo(-18 - length, y + (i - 1.5) * 0.8)
        .stroke({ color, width: 4.5 - i * 0.65, alpha: pose.afterimage * (0.28 - i * 0.035) });
    }
  }

  if (pose.skid > 0.05) {
    graphics.moveTo(-8, 19).lineTo(-18 - pose.skid * 34, 21)
      .stroke({ color: 0xf5e7c8, width: 2.2, alpha: pose.skid * 0.72 });
    graphics.moveTo(-3, 22).lineTo(-12 - pose.skid * 24, 24)
      .stroke({ color: 0x9b825f, width: 1.4, alpha: pose.skid * 0.62 });
  }

  if (pose.dust > 0.1) {
    const bucket = Math.floor(elapsedMs / 75);
    for (let i = 0; i < 4; i++) {
      const sample = effectSample(bucket, Math.floor(variant * 17), i);
      const radius = 1 + sample.length * 2;
      graphics.circle(-24 - sample.x * 15, 17 + sample.y * 7, radius)
        .fill({ color: 0xd7c7a4, alpha: pose.dust * sample.alpha * 0.42 });
    }
  }

  if (pose.impact > 0.06) {
    const radius = 17 + pose.impact * 20;
    graphics.circle(0, 0, radius).stroke({ color, width: 2.2, alpha: pose.impact * 0.56 });
    graphics.circle(0, 0, radius * 0.62).stroke({ color: 0xffffff, width: 1.2, alpha: pose.impact * 0.38 });
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2 + variant;
      const inner = 12 + (i % 2) * 4;
      const outer = 25 + pose.impact * (9 + (i % 3) * 3);
      graphics.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
        .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
        .stroke({ color: i % 2 ? color : 0xffffff, width: 1.5, alpha: pose.impact * 0.64 });
    }
  }
}
