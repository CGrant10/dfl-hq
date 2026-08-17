import type { FinishCamera } from "./contracts";
import { presentationScreenRatio } from "./finish-presentation";

export interface ArenaViewport {
  width: number; height: number; portrait: boolean; compact: boolean;
  laneTop: number; laneBottom: number; laneHeight: number;
  trackLeft: number; trackRight: number; trackWidth: number; actorScale: number;
}

export function arenaViewport(width: number, height: number): ArenaViewport {
  const safeWidth = Math.max(240, width);
  const safeHeight = Math.max(240, height);
  const portrait = safeHeight > safeWidth;
  const compact = safeHeight < 520 || safeWidth < 520;
  // These are the pre-Pixi Arena's layout constants. The DOM renderer places
  // lane centres through the middle 80% of the track and moves racer centres
  // from 3% to 91% of its width. Pixi must use the same coordinate system so
  // switching renderers cannot change the composition.
  const laneTop = safeHeight * 0.1;
  const laneBottom = safeHeight * 0.9;
  const trackLeft = safeWidth * 0.03;
  const trackRight = safeWidth * 0.91;
  const laneHeight = laneBottom - laneTop;
  // The locked large racer is 88px wherever the DOM keeps its desktop racer
  // width, including short landscape. Only <=640px phone layouts use 68px.
  // A Pixi character is 24 * 3 = 72px wide.
  const racerWidth = safeWidth <= 640 ? 68 : 88;
  const actorScale = racerWidth / 72;
  return { width: safeWidth, height: safeHeight, portrait, compact, laneTop, laneBottom,
    laneHeight, trackLeft, trackRight, trackWidth: trackRight - trackLeft, actorScale };
}

/*
  Lanes no longer compress under the camera.

  The squeeze existed to fake a low angle, and a faked low angle is exactly
  what this Arena stopped wanting: it moved every racer vertically at the
  moment of the finish, competing with the only movement that matters. The
  parameter is kept so callers do not have to change, and ignored.
*/
export function laneY(viewport: ArenaViewport, lane: number, racerCount: number, _cameraMix = 0): number {
  const count = Math.max(1, racerCount);
  const safeLane = Math.max(0, Math.min(count - 1, lane));
  const laneRatio = (safeLane + 0.5) / count;
  return viewport.laneTop + viewport.laneHeight * laneRatio;
}

export function screenX(viewport: ArenaViewport, progress: number, camera?: FinishCamera): number {
  if (!camera) {
    const p = Math.max(0, Math.min(1, progress));
    return viewport.trackLeft + viewport.trackWidth * p;
  }
  return viewport.width * presentationScreenRatio(progress, camera);
}

