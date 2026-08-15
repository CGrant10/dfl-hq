import type { PetMotion } from "./pet-texture";

export interface MotionPose {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  strideMs: number;
  afterimage: number;
  impact: number;
  dust: number;
}

export interface MotionInput {
  motion: PetMotion;
  elapsedMs: number;
  motionStartedMs?: number;
  lane: number;
  heat: number;
  variant: number;
  reducedMotion?: boolean;
}

const TAU = Math.PI * 2;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const easeOut = (value: number) => 1 - (1 - clamp01(value)) ** 3;
const pulse = (value: number) => Math.sin(clamp01(value) * Math.PI);

const base = (strideMs = 380): MotionPose => ({
  x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0,
  strideMs, afterimage: 0, impact: 0, dust: 0,
});

/**
 * Presentation-only animation choreography. Inputs are derived from the
 * authoritative race frame; this function can never change progress/order.
 */
export function motionPose(input: MotionInput): MotionPose {
  const heat = Math.max(0, Math.min(3, input.heat));
  const age = Math.max(0, input.elapsedMs - (input.motionStartedMs ?? 0));
  const phase = input.elapsedMs * (0.012 + heat * 0.0015) + input.lane * 0.73 + input.variant * 1.9;
  const wave = Math.sin(phase);

  // v1.86.1 flattened every decorative transform for reduced motion.
  if (input.reducedMotion) return base(620);

  if (input.motion === "idle") {
    // This is intentionally the exact v1.86.1 idle pose.
    return { ...base(), y: -0.75 - Math.sin(input.elapsedMs * 0.015 + input.lane * 0.7) * 0.75 };
  }

  if (input.motion === "run") {
    const strideMs = Math.max(235, 410 - heat * 48);
    const stride = input.elapsedMs / strideMs * TAU + input.lane * 0.61;
    const lift = Math.abs(Math.sin(stride));
    return {
      ...base(strideMs),
      x: Math.sin(stride * 0.5) * 0.45,
      y: -0.8 - lift * (1.6 + heat * 0.35),
      scaleX: 1 + Math.sin(stride) * 0.018,
      scaleY: 1 - Math.sin(stride) * 0.015,
      rotation: Math.sin(stride) * 0.018,
      dust: 0.14 + heat * 0.1,
    };
  }

  if (input.motion === "surge") {
    const p = clamp01(age / 920);
    const anticipation = p < 0.12 ? p / 0.12 : 1;
    const launch = p < 0.12 ? 0 : pulse((p - 0.12) / 0.48);
    const recover = easeOut((p - 0.6) / 0.4);
    return {
      ...base(190),
      x: -2.2 * (1 - anticipation) + launch * 3.5 * (1 - recover),
      y: p < 0.12 ? 1.4 * anticipation : -2.2 - Math.abs(wave) * 1.5,
      scaleX: 1 + launch * 0.15 * (1 - recover),
      scaleY: 1 - launch * 0.08 * (1 - recover),
      rotation: -0.08 * launch * (1 - recover),
      afterimage: launch * (0.45 + heat * 0.1),
      dust: 0.65 + launch * 0.35,
    };
  }

  if (input.motion === "stumble") {
    const p = clamp01(age / 1120);
    const catchFoot = pulse(p / 0.16);
    const skid = p >= 0.16 && p < 0.58 ? pulse((p - 0.16) / 0.42) : 0;
    const recover = p >= 0.58 ? easeOut((p - 0.58) / 0.42) : 0;
    const tumble = input.variant > 0.62 ? skid : 0;
    return {
      ...base(480),
      x: -catchFoot * 2.5 - skid * 3.2 + recover * 1.2,
      y: catchFoot * 1.2 + skid * 2.4 - recover * 1.1,
      scaleX: 1 + skid * 0.09,
      scaleY: 1 - skid * 0.14,
      rotation: catchFoot * 0.16 + skid * (0.22 + tumble * 0.34) - recover * 0.16,
      impact: pulse((p - 0.12) / 0.22),
      dust: Math.max(catchFoot, skid) * 0.9,
    };
  }

  if (input.motion === "jump") {
    const p = clamp01(age / 840);
    const crouch = p < 0.16 ? pulse(p / 0.16) : 0;
    const flight = p >= 0.16 && p < 0.76 ? (p - 0.16) / 0.6 : 0;
    const land = p >= 0.76 ? pulse((p - 0.76) / 0.24) : 0;
    return {
      ...base(285),
      x: flight ? easeOut(flight) * 2.3 : 0,
      y: crouch * 1.7 - Math.sin(flight * Math.PI) * (6.5 + heat * 0.8) + land * 1.7,
      scaleX: 1 + crouch * 0.08 - flight * 0.04 + land * 0.12,
      scaleY: 1 - crouch * 0.12 + flight * 0.08 - land * 0.16,
      rotation: flight ? -0.07 + flight * 0.12 : 0,
      impact: land,
      dust: Math.max(crouch * 0.5, land),
    };
  }

  if (input.motion === "duel") {
    const p = clamp01(age / 1050);
    const burst = Math.max(0, Math.sin(p * Math.PI * 5));
    return {
      ...base(205),
      x: burst * (1.8 + input.variant),
      y: -1.5 - Math.abs(wave) * 1.8,
      scaleX: 1 + burst * 0.09,
      scaleY: 1 - burst * 0.045,
      rotation: -burst * 0.05,
      afterimage: burst * 0.45,
      impact: pulse((p - 0.38) / 0.2) * 0.75,
      dust: 0.35 + burst * 0.45,
    };
  }

  if (input.motion === "near") {
    const p = clamp01(age / 680);
    const dodge = pulse(p / 0.55);
    const snap = pulse((p - 0.5) / 0.5);
    return {
      ...base(330),
      x: -dodge * 2.2 + snap * 1.2,
      y: -dodge * (3 + input.variant * 2) + snap,
      scaleX: 1 - dodge * 0.06 + snap * 0.08,
      scaleY: 1 + dodge * 0.1 - snap * 0.08,
      rotation: -dodge * 0.13 + snap * 0.08,
      impact: snap * 0.65,
      dust: snap * 0.55,
    };
  }

  // Winner: hit-pause, launch, then a readable loop without moving lanes.
  const p = clamp01(age / 1500);
  const launch = p < 0.18 ? 0 : pulse((p - 0.18) / 0.42);
  const celebrate = p < 0.6 ? 0 : Math.abs(Math.sin((p - 0.6) * Math.PI * 5));
  return {
    ...base(260),
    y: -launch * 8 - celebrate * 5,
    scaleX: 1 + launch * 0.18 + celebrate * 0.08,
    scaleY: 1 - launch * 0.08 + celebrate * 0.08,
    rotation: Math.sin(p * Math.PI * 4) * launch * 0.08,
    afterimage: launch * 0.55,
    impact: pulse((p - 0.08) / 0.15),
    dust: launch * 0.8,
  };
}

export function racerVariant(id: string | number, lane: number): number {
  let hash = 2166136261 ^ lane;
  for (const char of String(id)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0) / 0xffffffff;
}
