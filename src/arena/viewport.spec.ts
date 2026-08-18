import { describe, expect, it } from "vitest";
import { LANE_BAND_BOTTOM, LANE_BAND_TOP, arenaViewport, laneY, screenX } from "./viewport";
import { FINISH_LINE_RATIO, MAX_SETTLE } from "./finish-presentation";

describe("Arena responsive viewport", () => {
  const devices = [[320, 568], [390, 844], [667, 375], [844, 390], [1280, 720], [1920, 1080]] as const;
  for (const [width, height] of devices) {
    it(`keeps all 12 lanes visible at ${width}x${height}`, () => {
      const view = arenaViewport(width, height);
      const first = laneY(view, 0, 12);
      const last = laneY(view, 11, 12);
      expect(first).toBeGreaterThan(0);
      expect(last).toBeLessThan(view.height);
      expect(last).toBeGreaterThan(first);
      expect(screenX(view, 0)).toBeGreaterThanOrEqual(0);
      expect(screenX(view, 1)).toBeLessThanOrEqual(view.width);
      const band = LANE_BAND_BOTTOM - LANE_BAND_TOP;
      expect(first).toBeCloseTo(view.height * (LANE_BAND_TOP + band / 24));
      expect(last).toBeCloseTo(view.height * (LANE_BAND_BOTTOM - band / 24));
      expect(screenX(view, 0)).toBeCloseTo(view.width * 0.03);
      expect(screenX(view, 1)).toBeCloseTo(view.width * 0.91);
    });
  }
  /*
    MEASURED TRACK BOXES, NOT WINDOW SIZES.

    arenaViewport() is handed the Pixi HOST, which is the track - the stage
    minus the header, the footer and the leaderboard column. Testing it with
    window dimensions is how a bottom lane whose feet hung 0.2% off the edge
    of a 294px-tall landscape track passed a spec that thought the box was
    390px tall. These four are measured from the running Race View at
    1920x1080, 1280x720, 844x390 landscape and 254x687 portrait.
  */
  const trackBoxes = [[1572, 792], [1024, 527], [675, 294], [139, 466]] as const;

  it("keeps every lane inside the course band, below the scenery", () => {
    /*
      THE GROUNDING INVARIANT. The strip above LANE_BAND_TOP is sky, hills
      and crowd; the band itself is the running surface. A racer drawn above
      the band is a racer running through the scenery, and one drawn below it
      has their feet clipped off the bottom of the course - so both ends have
      to clear by half a drawn character at every size the app runs at.
    */
    for (const [width, height] of trackBoxes) {
      const view = arenaViewport(width, height);
      const halfCharacter = 15 * 3 * view.actorScale / 2;
      const courseTop = view.height * 0.165;      // css/broadcast.css .race-course
      expect(laneY(view, 0, 12) + halfCharacter).toBeGreaterThan(courseTop);
      expect(laneY(view, 11, 12) + halfCharacter).toBeLessThanOrEqual(view.height);
      expect(laneY(view, 0, 12)).toBeGreaterThanOrEqual(view.height * LANE_BAND_TOP);
      expect(laneY(view, 11, 12)).toBeLessThanOrEqual(view.height * LANE_BAND_BOTTOM);
    }
  });

  it("shifted the band down without squeezing the lanes together", () => {
    // A drawn character is 15 rows at PIXEL_SIZE 3. The pitch has to stay at
    // least that, or grounding the field would have cost lane separation.
    const view = arenaViewport(1920, 1080);
    const pitch = laneY(view, 1, 12) - laneY(view, 0, 12);
    expect(pitch).toBeGreaterThanOrEqual(15 * 3 * view.actorScale * 0.88);
    expect(LANE_BAND_BOTTOM - LANE_BAND_TOP).toBeGreaterThan(0.72);
    expect(LANE_BAND_TOP).toBeGreaterThan(0.12);
    expect(LANE_BAND_BOTTOM).toBeLessThanOrEqual(0.95);
  });

  it("matches the legacy responsive racer sizes", () => {
    expect(arenaViewport(1280, 720).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(1920, 1080).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(390, 844).actorScale * 72).toBeCloseTo(68);
    expect(arenaViewport(667, 375).actorScale * 72).toBeCloseTo(88);
    expect(arenaViewport(844, 390).actorScale * 72).toBeCloseTo(88);
  });
  it("clamps invalid lane and progress values", () => {
    const view = arenaViewport(1280, 720);
    expect(laneY(view, -4, 12)).toBe(laneY(view, 0, 12));
    expect(laneY(view, 99, 12)).toBe(laneY(view, 11, 12));
    expect(screenX(view, -1)).toBe(screenX(view, 0));
    expect(screenX(view, 2)).toBe(screenX(view, 1));
  });

  it("puts the stripe on the shared finish ratio and runs off past it", () => {
    const view = arenaViewport(1280, 720);
    const camera = { state: "finish" as const, mix: 0.34, finishRatio: FINISH_LINE_RATIO };
    expect(screenX(view, 1, camera)).toBeCloseTo(view.width * FINISH_LINE_RATIO);
    /* And there is real room past it - the run-out, not a sliver. */
    const runOut = screenX(view, 1 + MAX_SETTLE, camera) - screenX(view, 1, camera);
    expect(runOut).toBeGreaterThan(view.width * 0.15);
  });

  it("no longer squeezes the lanes for the camera", () => {
    // The faked low angle is gone: lane Y must not depend on the camera.
    const view = arenaViewport(1280, 720);
    for (const lane of [0, 5, 11]) {
      expect(laneY(view, lane, 12, 1)).toBeCloseTo(laneY(view, lane, 12, 0));
    }
  });
});

