import { describe, expect, it } from "vitest";
import { winnerPhase } from "./winner-sequence";

describe("winner sequence", () => {
  it("starts with a short impact freeze then releases into celebration", () => {
    expect(winnerPhase(50).freeze).toBe(1);
    expect(winnerPhase(150).freeze).toBe(0);
    expect(winnerPhase(500).launch).toBeGreaterThan(0);
    expect(winnerPhase(900).celebrate).toBeGreaterThan(0);
  });

  it("gives losers a finite reaction rather than moving their race result", () => {
    expect(winnerPhase(120).loserReaction).toBe(0);
    expect(winnerPhase(500).loserReaction).toBeGreaterThan(0);
    expect(winnerPhase(1200).loserReaction).toBe(0);
  });
});
