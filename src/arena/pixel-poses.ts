export type PixelPose = 0 | 1 | 2 | 3;

function shiftRow(row: string, amount: number): string {
  if (amount === 0) return row;
  return amount > 0 ? `${".".repeat(amount)}${row.slice(0, -amount)}` : `${row.slice(-amount)}${".".repeat(-amount)}`;
}

/**
 * Builds four readable stride drawings from the exact character pixels.
 * Only row offsets change; palette, silhouette source and cosmetics stay the
 * same. This avoids a two-frame opacity blink without inventing new art.
 */
export function pixelPoseRows(rows: readonly string[], pose: PixelPose): string[] {
  if (pose === 0) return [...rows];
  return rows.map((row, y) => {
    const lowerBody = y >= Math.max(9, rows.length - 6);
    if (!lowerBody) return pose === 1 || pose === 3 ? shiftRow(row, 1) : row;
    if (pose === 1) return shiftRow(row, y % 2 === 0 ? 1 : -1);
    if (pose === 2) return shiftRow(row, y % 3 === 0 ? 1 : 0);
    return shiftRow(row, y % 2 === 0 ? -1 : 1);
  });
}

export function cyclePose(elapsedMs: number, cycleMs: number): PixelPose {
  const safeCycle = Math.max(120, cycleMs);
  return Math.floor((Math.max(0, elapsedMs) % safeCycle) / (safeCycle / 4)) as PixelPose;
}
