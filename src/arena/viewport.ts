import type { FinishCamera } from "./contracts";
import { presentationScreenRatio } from "./finish-presentation";

export interface ArenaViewport {
  width: number; height: number; portrait: boolean; compact: boolean;
  laneTop: number; laneBottom: number; laneHeight: number;
  trackLeft: number; trackRight: number; trackWidth: number; actorScale: number;
}

/*
  THE LANE BAND IS THE COURSE, AND IT IS THE ONLY PLACE A RACER MAY BE.

  This used to be the middle 80% of the track - lane centres from 10% to
  90% - which was a reasonable spread of twelve rows and a bad composition.
  The scenery behind it drew its horizon around the middle of that same
  band, so the top four or five lanes were literally above the horizon: the
  racers in them read as running through the sky, with the crowd somewhere
  down by their feet.

  The band is now the RUNNING SURFACE and the strip above it is the world
  behind the course - sky, distant hills, crowd, banners. Shifting rather
  than squeezing was the point: the pitch between lanes only drops from
  6.67% to 6.17% of the track, so nothing got meaningfully more crowded to
  buy the horizon.

  BOTTOM IS 0.92 AND NOT 0.94 BECAUSE OF SHORT LANDSCAPE. A drawn character
  is 15 rows at PIXEL_SIZE 3, scaled - about 55px - and a phone in landscape
  gives the track under 300px of height, so the last lane's feet are more
  than 9% of the box below its centre. At 0.94 they landed at 100.2% and the
  bottom racer's contact shadow was clipped off the edge of the course. It is
  measured against the real track boxes in viewport.spec.ts, not against
  window heights, because the track is what the renderer is handed.

  css/broadcast.css lays the course bands out against these two numbers and
  js/arena/racer-view.js positions the DOM lanes from them, so there is one
  definition of where the ground is. If they move, they move together.
*/
export const LANE_BAND_TOP = 0.18;
export const LANE_BAND_BOTTOM = 0.92;

export function arenaViewport(width: number, height: number): ArenaViewport {
  const safeWidth = Math.max(240, width);
  const safeHeight = Math.max(240, height);
  const portrait = safeHeight > safeWidth;
  const compact = safeHeight < 520 || safeWidth < 520;
  // The DOM renderer places lane centres through the course band and moves
  // racer centres from 3% to 91% of the track width. Pixi must use the same
  // coordinate system so switching renderers cannot change the composition.
  const laneTop = safeHeight * LANE_BAND_TOP;
  const laneBottom = safeHeight * LANE_BAND_BOTTOM;
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

