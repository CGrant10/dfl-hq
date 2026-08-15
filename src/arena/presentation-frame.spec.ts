import { describe, expect, it } from "vitest";
import { createReactionTimeline, presentationRacerFrame, reactionAt } from "./presentation-frame";

describe("shared Arena presentation frames", () => {
  it("reconstructs the same reactions at any viewer clock", () => {
    const timeline = createReactionTimeline(
      [{ kind: "stumble", racer: 0, ms: 500, durMs: 400 }],
      [{ kind: "swap", racer: 0, other: 1, ms: 1000, durMs: 300 }],
      2,
    );
    expect(reactionAt(timeline, 0, 650)?.kind).toBe("stumble");
    expect(reactionAt(timeline, 1, 1100)?.kind).toBe("duel");
    expect(reactionAt(timeline, 0, 1400)).toBeNull();
  });

  it("derives identical motion values without changing authoritative progress", () => {
    const frame = presentationRacerFrame({
      id: "r1", lane: 0, samples: [0, 0.1, 0.24], lo: 1, hi: 2, mix: 0.5, elapsedMs: 250,
    });
    expect(frame.progress).toBeCloseTo(0.17);
    expect(frame.speed).toBeGreaterThan(0);
    expect(frame.finished).toBe(false);
  });

  it("holds every viewer on the start grid during countdown", () => {
    const frame = presentationRacerFrame({
      id: "r1", lane: 0, samples: [0, 0.1], lo: 0, hi: 1, mix: 0.8, elapsedMs: -500,
    });
    expect(frame.progress).toBe(0);
  });
});
