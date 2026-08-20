// Finish-line presentation hotfix.
//
// The committed Pixi runtime currently eases the finish structure to a stop
// and parks it on the line 420ms before P1 officially crosses. The race
// physics are fine, but visually that stationary structure becomes an anchor
// while the course is still moving, which makes the whole field look like it
// suddenly slowed down.
//
// Keep the runtime as the source for every other presentation decision, but
// replace ONLY the finish approach and course-stop timing. No racer progress,
// finish time, order, or run-off geometry is touched.
//
// The visual rule is now whole-field, not winner-only:
//   1. Before P1, the finish stripe and course travel together at constant speed.
//   2. On P1's exact crossing frame, the stripe reaches the line and the course
//      locks into a fixed finish camera.
//   3. P2 through the final racer keep running through that same fixed line.
//
// That removes the optical "everyone slows at the line" effect for the entire
// field: there is never a stationary stripe against a still-moving background.

export * from "./pixi-runtime.js?finish-base=1";
import { createFinishPresentation as createBaseFinishPresentation } from "./pixi-runtime.js?finish-base=1";

const FINISH_ENTRY_RATIO = 1.02;
const FINISH_LINE_RATIO = 0.58;
const FINISH_ROLL_MS = 3500;

const clamp01 = (value) => Math.max(0, Math.min(1, value));

export function createFinishPresentation(input) {
  const finish = createBaseFinishPresentation(input);
  const firstFinishMs = Number(input?.order?.[0]?.finishMs);
  const elapsedMs = Number(input?.elapsedMs);

  if (!Number.isFinite(firstFinishMs) || !Number.isFinite(elapsedMs)) return finish;

  // Constant velocity all the way to P1's actual crossing. The stripe never
  // eases into a parking spot and never sits in the frame while the ground
  // continues sliding underneath it.
  const startMs = firstFinishMs - FINISH_ROLL_MS;
  const arrival = clamp01((elapsedMs - startMs) / FINISH_ROLL_MS);
  finish.groundRatio = FINISH_ENTRY_RATIO
    + (FINISH_LINE_RATIO - FINISH_ENTRY_RATIO) * arrival;

  // Whole-field finish camera. The instant P1 crosses, both the stripe and the
  // world stop translating. Every later racer therefore crosses a stationary
  // line against stationary course scenery while their own motion stays live.
  finish.courseStopped = elapsedMs >= firstFinishMs;

  return finish;
}
