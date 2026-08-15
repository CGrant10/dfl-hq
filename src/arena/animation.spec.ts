import { describe, expect, it } from "vitest";
import { motionPose, racerVariant } from "./animation";

describe("Arena presentation choreography", () => {
  it("preserves the locked idle pose", () => {
    const pose = motionPose({ motion: "idle", elapsedMs: 0, lane: 0, heat: 0, variant: 0 });
    expect(pose).toMatchObject({ x: 0, y: -0.75, scaleX: 1, scaleY: 1, rotation: 0 });
  });

  it("never produces non-finite transforms for any motion", () => {
    for (const motion of ["idle", "run", "surge", "stumble", "jump", "duel", "near", "win", "lose"] as const) {
      for (const elapsedMs of [0, 90, 320, 780, 1600]) {
        const pose = motionPose({ motion, elapsedMs, motionStartedMs: 100, lane: 11, heat: 3, variant: 0.72 });
        expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it("derives stable racer variants without race randomness", () => {
    expect(racerVariant("racer-4", 3)).toBe(racerVariant("racer-4", 3));
    expect(racerVariant("racer-4", 3)).not.toBe(racerVariant("racer-5", 3));
  });

  it("reconstructs the same reaction pose after reconnect", () => {
    const input = { motion: "jump" as const, elapsedMs: 7_450, motionStartedMs: 7_100, lane: 4, heat: 2, variant: 0.31 };
    expect(motionPose(input)).toEqual(motionPose({ ...input }));
  });

  it("returns a static legacy fallback for reduced motion", () => {
    expect(motionPose({ motion: "surge", elapsedMs: 900, lane: 2, heat: 3, variant: 0.5, reducedMotion: true }))
      .toMatchObject({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, afterimage: 0, impact: 0, dust: 0 });
  });
});
