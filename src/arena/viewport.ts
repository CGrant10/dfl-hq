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
  const laneTop = safeHeight * (portrait ? 0.19 : compact ? 0.18 : 0.2);
  const laneBottom = safeHeight * (portrait ? 0.83 : compact ? 0.84 : 0.82);
  const trackLeft = safeWidth * (portrait ? 0.06 : 0.045);
  const trackRight = safeWidth * (portrait ? 0.94 : 0.955);
  const laneHeight = laneBottom - laneTop;
  const screenScale = Math.min(safeWidth / 1050, safeHeight / 690);
  const laneScale = (laneHeight / 12 / 58) * 1.45;
  const actorScale = Math.max(0.42, Math.min(1.45, screenScale * 1.12, laneScale));
  return { width: safeWidth, height: safeHeight, portrait, compact, laneTop, laneBottom,
    laneHeight, trackLeft, trackRight, trackWidth: trackRight - trackLeft, actorScale };
}

export function laneY(viewport: ArenaViewport, lane: number, racerCount: number): number {
  const count = Math.max(1, racerCount);
  const safeLane = Math.max(0, Math.min(count - 1, lane));
  return viewport.laneTop + viewport.laneHeight * ((safeLane + 0.5) / count);
}

export function screenX(viewport: ArenaViewport, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return viewport.trackLeft + viewport.trackWidth * p;
}

