export function capHoleDistance(distance, holeYards) {
  if (distance == null || distance === "") return null;
  const measured = Number(distance);
  const maximum = Number(holeYards);
  if (!Number.isFinite(measured) || measured < 0) return null;
  return Number.isFinite(maximum) && maximum > 0 ? Math.min(measured, maximum) : measured;
}

export function isOutsideHole(distance, holeYards) {
  if (distance == null || distance === "") return false;
  const measured = Number(distance);
  const maximum = Number(holeYards);
  return Number.isFinite(measured) && Number.isFinite(maximum) && maximum > 0 && measured > maximum * 1.35;
}

export function holeZoom(distance) {
  const yards = Number(distance);
  if (!Number.isFinite(yards)) return 18;
  if (yards <= 60) return 20;
  if (yards <= 140) return 19;
  if (yards <= 280) return 18;
  return 17;
}
