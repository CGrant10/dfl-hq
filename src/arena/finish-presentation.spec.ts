import { describe, expect, it } from "vitest";
import {
  FINISH_LINE_RATIO,
  MAX_CAMERA_MIX,
  MAX_SETTLE,
  RUN_OFF_RATIO,
  TRACK_START,
  finishArrival,
  finishSettledMs,
  FINISH_SETTLED_LEAD_MS,
  RESULT_BEAT_MS,
  FINISH_ROLL_MS,
  FINISH_ENTRY_RATIO,
  ROLL_LINEAR_UNTIL,
  ROLL_SLOPE,
  STAMP_HOLD_MS,
  finishGroundRatio,
  finishStamp,
  FINAL_STRETCH_START,
  PHOTO_FINISH_THRESHOLD_MS,
  cameraForLeader,
  createFinishPresentation,
  presentationScreenRatio,
} from "./finish-presentation";

const racers = [
  { id: "a", name: "Alpha", number: 1, color: "#fff", pet: null },
  { id: "b", name: "Bravo", number: 2, color: "#fff", pet: null },
  { id: "c", name: "Charlie", number: 3, color: "#fff", pet: null },
];
const order = [
  { index: 0, finishMs: 10_000 },
  { index: 1, finishMs: 10_120 },
  { index: 2, finishMs: 11_000 },
];

describe("Arena finish presentation", () => {
  it("maps the track with one straight line the camera cannot bend", () => {
    // The whole point of the rewrite: geometry is independent of the camera,
    // so "a bit of finish emphasis" can never slide a racer sideways.
    for (const leader of [0, 0.5, 0.85, 0.94, 1]) {
      const camera = cameraForLeader(leader);
      expect(presentationScreenRatio(0, camera)).toBeCloseTo(TRACK_START);
      expect(presentationScreenRatio(1, camera)).toBeCloseTo(FINISH_LINE_RATIO);
      expect(presentationScreenRatio(0.5, camera)).toBeCloseTo(
        TRACK_START + 0.5 * (FINISH_LINE_RATIO - TRACK_START));
    }
  });

  it("keeps the gradient continuous where a racer crosses", () => {
    // A change of scale at the stripe is exactly what reads as a stutter.
    const camera = cameraForLeader(1);
    const h = 1e-4;
    const before = (presentationScreenRatio(1, camera) - presentationScreenRatio(1 - h, camera)) / h;
    const after = (presentationScreenRatio(1 + h, camera) - presentationScreenRatio(1, camera)) / h;
    expect(after / before).toBeGreaterThan(0.85);
    expect(after / before).toBeLessThan(1.2);
  });

  it("gives finishers a run-off strip and never leaves the frame", () => {
    const camera = cameraForLeader(1);
    expect(presentationScreenRatio(1 + MAX_SETTLE, camera))
      .toBeCloseTo(FINISH_LINE_RATIO + RUN_OFF_RATIO);
    expect(presentationScreenRatio(1 + MAX_SETTLE, camera)).toBeLessThan(1);
    expect(presentationScreenRatio(99, camera)).toBeLessThan(1);
    const samples = [0.5, 0.9, 1, 1.05, 1.1, 1.16]
      .map((progress) => presentationScreenRatio(progress, camera));
    expect(samples.every((value, index) => index === 0 || value > samples[index - 1]!)).toBe(true);
  });

  it("reserves a real run-out: stripe near the middle, open space past it", () => {
    // The huddle was geometric: twelve parking spots inside 12% of the
    // frame, hard against a stripe at 78%. The stripe is at 58% now and the
    // run-out is the rest.
    expect(FINISH_LINE_RATIO).toBeGreaterThan(0.5);
    expect(FINISH_LINE_RATIO).toBeLessThan(0.62);
    const runOut = presentationScreenRatio(1 + MAX_SETTLE) - presentationScreenRatio(1);
    expect(runOut).toBeGreaterThan(0.15);
    expect(presentationScreenRatio(1 + MAX_SETTLE)).toBeLessThan(0.97);
  });

  it("approaches once, monotonically, and never reverses", () => {
    /*
      THE BOOMERANG REGRESSION. The old reveal was a function of drawn leader
      progress, which is non-monotonic because collapses are a feature -
      measured, the stripe reversed in 8 of 25 seeded races. This is a
      clamped ramp on a clock, so it cannot.
    */
    const first = 11_099;
    let prev = -1;
    for (let ms = 0; ms <= first + 6000; ms += 16) {
      const p = finishArrival(ms, first);
      expect(p).toBeGreaterThanOrEqual(prev);       // never goes backwards
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      prev = p;
    }
  });

  it("is hidden for almost the whole race and is standing on the line before the crossing", () => {
    const first = 11_099;
    expect(finishArrival(0, first)).toBe(0);
    expect(finishArrival(first - FINISH_ROLL_MS, first)).toBe(0);
    expect(finishArrival(first * 0.5, first)).toBe(0);
    /*
      THE FIX, AS AN ASSERTION. The structure is HOME - not halfway, not
      still offscreen - before the winner gets there, and it stays home while
      the rest of the field comes through. The old pass was at 0.117 to 0.238
      here, which put it 108% to 131% of the way across the viewport: the
      winner crossed nothing at all.
    */
    expect(finishArrival(first - FINISH_SETTLED_LEAD_MS, first)).toBe(1);
    expect(finishArrival(first, first)).toBe(1);
    expect(finishArrival(first + 8000, first)).toBe(1);
    expect(finishSettledMs(first)).toBeLessThan(first);
  });

  it("does not let the spread of the field move the finish line", () => {
    // Making the structure's position depend on the LAST finish is exactly
    // what dragged the crossing moment seconds past the crossing.
    const first = 20_000;
    for (const ms of [first - 900, first - 420, first, first + 3000]) {
      expect(finishArrival(ms, first)).toBe(finishArrival(ms, first));
    }
    expect(finishArrival(first, first)).toBe(finishArrival(first, first));
  });

  it("cannot be dragged backwards by a racer falling back", () => {
    /*
      Seed 32676 reversed the old implementation. The input here is elapsed
      time, so a backslide in `shown` is structurally incapable of moving the
      scenery - this asserts the signature carries no progress at all.
    */
    const a = finishArrival(10_400, 11_099);
    expect(a).toBe(finishArrival(10_400, 11_099));
    expect(finishArrival(10_500, 11_099)).toBeGreaterThan(a);
  });

  it("derives identically for live and shared from the same inputs", () => {
    // Stateless and pure: two callers with the same clock agree by
    // construction, so the two views cannot drift.
    for (const ms of [0, 9000, 10_500, 11_099, 12_000, 13_500]) {
      expect(finishArrival(ms, 11_099)).toBe(finishArrival(ms, 11_099));
    }
  });

  it("keeps the camera to an emphasis signal, not a move", () => {
    expect(cameraForLeader(0.5).mix).toBe(0);
    expect(cameraForLeader(1).mix).toBeCloseTo(MAX_CAMERA_MIX);
    expect(MAX_CAMERA_MIX).toBeLessThan(0.4);
  });

  it("uses the real P1/P2 gap for photo finish and a brief hit-stop", () => {
    const atStripe = createFinishPresentation({ elapsedMs: 10_120, leaderProgress: 1, order, racers });
    expect(atStripe.photoFinish?.gapMs).toBe(120);
    expect(atStripe.photoFinish?.phase).toBe("flash");
    expect(atStripe.visualElapsedMs).toBe(10_120);
    const outside = createFinishPresentation({
      elapsedMs: 10_250, leaderProgress: 1,
      order: [{ index: 0, finishMs: 10_000 }, { index: 1, finishMs: 10_000 + PHOTO_FINISH_THRESHOLD_MS + 1 }],
      racers,
    });
    expect(outside.photoFinish).toBeUndefined();
  });

  it("waits until every official finish before celebrating", () => {
    expect(createFinishPresentation({ elapsedMs: 11_200, leaderProgress: 1, order, racers }).celebrationActive).toBe(false);
    expect(createFinishPresentation({ elapsedMs: 11_400, leaderProgress: 1, order, racers }).celebrationActive).toBe(true);
  });
  /*
    THE PRESENTATION TRUTH RULE, AS SPECS.

    The viewer must see the finish happen before the UI tells them who won.
    Everything below is a way of failing if some future change lets a result
    graphic land before the decisive crossing has been drawn.
  */
  describe("nothing resolves the race before the crossing is shown", () => {
    const photoOrder = [
      { index: 0, finishMs: 10_000 },
      { index: 1, finishMs: 10_120 },
      { index: 2, finishMs: 11_000 },
    ];
    const clearOrder = [
      { index: 0, finishMs: 10_000 },
      { index: 1, finishMs: 12_400 },
      { index: 2, finishMs: 13_900 },
    ];
    const at = (elapsedMs: number, order = photoOrder) =>
      createFinishPresentation({ elapsedMs, leaderProgress: 1, order, racers });

    it("marks the decisive crossing as the second line in a photo finish", () => {
      expect(at(10_119).crossingShown).toBe(false);
      expect(at(10_120).crossingShown).toBe(true);
    });

    it("marks it as the winner's own line when the race is not close", () => {
      expect(at(9_999, clearOrder).crossingShown).toBe(false);
      expect(at(10_000, clearOrder).crossingShown).toBe(true);
      // and not the last finish: the field still has 3.9s to come home
      expect(at(10_000, clearOrder).celebrationActive).toBe(false);
    });

    it("holds the photo-finish RESULT until the crossing plus one beat", () => {
      // Approach is allowed early - it is tension, not an answer.
      expect(at(9_400).photoFinish?.phase).toBe("approach");
      expect(at(10_119).photoFinish?.phase).toBe("approach");
      expect(at(10_120).photoFinish?.phase).toBe("flash");
      expect(at(10_120 + RESULT_BEAT_MS - 1).photoFinish?.phase).toBe("flash");
      expect(at(10_120 + RESULT_BEAT_MS).photoFinish?.phase).toBe("result");
    });

    it("keeps the beat short enough that the reveal is not sluggish", () => {
      expect(RESULT_BEAT_MS).toBeLessThanOrEqual(320);
    });

    it("never celebrates before the crossing, at any clock position", () => {
      for (const order of [photoOrder, clearOrder]) {
        for (let ms = 0; ms <= 16_000; ms += 20) {
          const finish = at(ms, order);
          if (finish.celebrationActive) expect(finish.crossingShown).toBe(true);
          if (finish.photoFinish?.phase === "result") expect(finish.crossingShown).toBe(true);
          if (finish.crossingShown) expect(finishArrival(ms, order[0]!.finishMs)).toBe(1);
        }
      }
    });
  });

  /* ================= the line is scenery, not an overlay ================= */

  it("rolls at ground speed, not at graphic speed", () => {
    /*
      THE REGRESSION THIS EXISTS TO CATCH. The old roll covered the same
      travel in 1100ms, about eleven times the leader's own screen speed, and
      a thing that crosses the ground eleven times faster than the runners on
      it reads as a graphic flying over the top - which is exactly what it
      looked like.

      The racers' late-race screen speed is TRACK_SCALE over the race, sped up
      through the final stretch: about 1e-4 of the frame per ms. The structure
      is allowed to be quicker than the field it is coming to meet, but only
      by a small factor. Above about 3x it stops reading as ground.
    */
    const travel = FINISH_ENTRY_RATIO - FINISH_LINE_RATIO;
    const rollMs = FINISH_ROLL_MS - FINISH_SETTLED_LEAD_MS;
    const structureSpeed = (travel * ROLL_SLOPE) / rollMs;
    const racerSpeed = 1e-4;
    expect(structureSpeed / racerSpeed).toBeLessThan(3);
    expect(structureSpeed / racerSpeed).toBeGreaterThan(0.5);
  });

  it("spends most of the roll at ONE velocity and only bleeds off at the end", () => {
    // An ease-out across the whole travel is fastest on its first frame and
    // decelerating for the entire journey. Nothing on the ground moves like
    // that. Ninety percent of this happens at a constant speed.
    const first = 11_099;
    const start = first - FINISH_ROLL_MS;
    const settled = finishSettledMs(first);
    const at = (r: number) => finishArrival(start + (settled - start) * r, first);
    const step = 0.02;
    const slopes: number[] = [];
    for (let r = 0; r + step <= ROLL_LINEAR_UNTIL - 0.01; r += step) {
      slopes.push((at(r + step) - at(r)) / step);
    }
    const min = Math.min(...slopes), max = Math.max(...slopes);
    expect(max - min).toBeLessThan(0.02);          // one velocity, not a curve
    expect(at(ROLL_LINEAR_UNTIL)).toBeGreaterThan(0.88);  // 90% of the travel
    // ...and it still arrives, with the last of the distance easing to rest.
    expect(at(1)).toBeCloseTo(1);
    const tail = (at(1) - at(0.98)) / 0.02;
    expect(tail).toBeLessThan(min / 2);
  });

  it("places the structure in the racers' own coordinate system", () => {
    /*
      The finish line used to be a DOM div at `right:42%` translating in from
      55vw - its own units, its own layer, its own idea of where the middle
      is. It now returns a ratio of the frame, the same thing
      presentationScreenRatio() returns for a racer, and it comes to rest on
      exactly progress 1.0. A finish line anywhere else is one nobody crosses.
    */
    const first = 11_099;
    expect(finishGroundRatio(first, first)).toBeCloseTo(presentationScreenRatio(1));
    expect(finishGroundRatio(first - FINISH_SETTLED_LEAD_MS, first))
      .toBeCloseTo(FINISH_LINE_RATIO);
    expect(finishGroundRatio(0, first)).toBeCloseTo(FINISH_ENTRY_RATIO);
    // It approaches from ahead of the field and never overtakes anybody.
    for (let ms = 0; ms <= first; ms += 50) {
      expect(finishGroundRatio(ms, first)).toBeGreaterThanOrEqual(FINISH_LINE_RATIO);
    }
  });

  it("rolls in monotonically, one direction only", () => {
    const first = 11_099;
    let prev = Infinity;
    for (let ms = 0; ms <= first + 4000; ms += 16) {
      const x = finishGroundRatio(ms, first);
      expect(x).toBeLessThanOrEqual(prev + 1e-12);
      prev = x;
    }
  });

  it("is in shot and MOVING for seconds before the winner, not parked", () => {
    // The complaint was that it arrived and stood there. It is now travelling
    // for most of its time on screen, and parked only for the settling beat.
    const first = 11_099;
    const entered = finishGroundRatio(first - FINISH_ROLL_MS + 200, first);
    expect(entered).toBeLessThan(FINISH_ENTRY_RATIO);
    expect(finishGroundRatio(first - 2000, first)).toBeLessThan(entered);
    expect(finishGroundRatio(first - 1000, first))
      .toBeLessThan(finishGroundRatio(first - 2000, first));
  });

  /* ===================== the line times each racer ===================== */

  it("stamps each racer as they touch the line, latest one holding the slot", () => {
    expect(finishStamp(order, 0)).toBeUndefined();
    expect(finishStamp(order, 9_999)).toBeUndefined();

    const first = finishStamp(order, 10_000);
    expect(first?.index).toBe(0);
    expect(first?.place).toBe(1);
    expect(first?.finishMs).toBe(10_000);
    expect(first?.fade).toBeCloseTo(1);

    // 120ms later the second racer is on the line. The slot is theirs - two
    // times overlapping at one structure is unreadable.
    const second = finishStamp(order, 10_120);
    expect(second?.index).toBe(1);
    expect(second?.place).toBe(2);

    const third = finishStamp(order, 11_000);
    expect(third?.place).toBe(3);
    expect(finishStamp(order, 11_000 + STAMP_HOLD_MS)).toBeUndefined();
  });

  it("fades a stamp monotonically and is seekable", () => {
    let prev = Infinity;
    for (let ms = 11_000; ms < 11_000 + STAMP_HOLD_MS; ms += 20) {
      const stamp = finishStamp(order, ms);
      expect(stamp?.fade).toBeLessThanOrEqual(prev + 1e-12);
      prev = stamp?.fade ?? 0;
      expect(finishStamp(order, ms)?.fade).toBe(stamp?.fade);  // pure
    }
  });

  it("carries the structure position and the stamp on the presentation", () => {
    const frame = createFinishPresentation({
      elapsedMs: 10_000, leaderProgress: 1, order, racers,
    });
    expect(frame.groundRatio).toBeCloseTo(finishGroundRatio(10_000, 10_000));
    expect(frame.stamp?.index).toBe(0);
    const early = createFinishPresentation({
      elapsedMs: 0, leaderProgress: 0, order, racers,
    });
    expect(early.groundRatio).toBeCloseTo(FINISH_ENTRY_RATIO);
    expect(early.stamp).toBeUndefined();
  });

  /* ================== the run-off has to fit the field ================== */

  it("reserves a run-off measured in racer widths, not in frame percent", () => {
    /*
      0.34 gave twelve finishers 18% of the width, about 1.2% each, against a
      drawn racer 10% of the width wide - so every one of them overlapped its
      neighbours almost entirely and the run-out was a pile. This asserts the
      per-place stagger, which is the thing that reads.
    */
    const runOut = presentationScreenRatio(1 + MAX_SETTLE) - presentationScreenRatio(1);
    expect(runOut).toBeGreaterThan(0.3);
    expect(runOut / 12).toBeGreaterThan(0.025);
    // and the last place still parks inside the frame
    expect(presentationScreenRatio(1 + MAX_SETTLE)).toBeLessThan(0.95);
  });

});
