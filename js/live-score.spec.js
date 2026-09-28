import { describe, expect, it } from "vitest";
import { matchupMoment, playerLiveState, scoreTransition } from "./live-score.js";

describe("live score presentation", () => {
  it("uses honest player states without calling every recorded score final", () => {
    expect(playerLiveState({ hasGame: true })).toEqual({ key: "projected", label: "YET TO PLAY" });
    expect(playerLiveState({ hasGame: true, isPlaying: true })).toEqual({ key: "playing", label: "PLAYING" });
    expect(playerLiveState({ hasGame: true, scoreSource: "actual" })).toEqual({ key: "played", label: "PLAYED" });
    expect(playerLiveState({ hasGame: true, complete: true })).toEqual({ key: "final", label: "FINAL" });
  });

  it("recognizes score jumps and final changes", () => {
    expect(scoreTransition(7, 14)).toMatchObject({ delta: 7, kind: "big-play" });
    expect(scoreTransition(14, 15.2)).toMatchObject({ delta: 1.2, kind: "score" });
    expect(scoreTransition(15.2, 18, { final: true })).toMatchObject({ kind: "final" });
    expect(scoreTransition(18, 18)).toBeNull();
  });

  it("recognizes comebacks, finals and projected upsets", () => {
    expect(matchupMoment({ states: ["playing", "playing"], values: [21, 18], previousLeader: "b" }))
      .toMatchObject({ leader: "a", source: "comeback" });
    expect(matchupMoment({ states: ["final", "final"], values: [19, 24], previousState: "playing", projectedLeader: "a" }))
      .toMatchObject({ leader: "b", source: "upset" });
    expect(matchupMoment({ states: ["final", "playing"], values: [19, 24] })).toBeNull();
  });
});
