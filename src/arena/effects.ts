export interface EffectSample {
  x: number;
  y: number;
  length: number;
  alpha: number;
}

function hash(value: number): number {
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

/** Stable pseudo-random samples: same race time/lane always paints the same effect. */
export function effectSample(bucket: number, lane: number, index: number): EffectSample {
  const seed = hash(bucket * 131 + lane * 977 + index * 7919);
  return {
    x: (seed & 0xffff) / 0xffff,
    y: ((seed >>> 16) & 0xffff) / 0xffff,
    length: 0.35 + (hash(seed + 1) & 0xffff) / 0xffff * 0.65,
    alpha: 0.3 + (hash(seed + 2) & 0xffff) / 0xffff * 0.7,
  };
}

export function effectDensity(heat: number, compact: boolean, reducedMotion: boolean): number {
  if (heat <= 0) return 0;
  const quality = (compact ? 0.72 : 1) * (reducedMotion ? 0.28 : 1);
  return Math.round((18 + Math.min(3, heat) * 11) * quality);
}
