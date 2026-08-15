import type { SharedRaceEvent } from "./contracts";

export type SharedViewState = "open" | "countdown" | "running" | "paused" | "finished";

export interface SharedClock {
  state: SharedViewState;
  elapsedMs: number;
  countdownMs: number;
}

/** Derives the same playback clock on every device, including reconnects. */
export function sharedClock(event: SharedRaceEvent, nowMs: number, countdownMs = 3000): SharedClock {
  const offset = Math.max(0, Number(event.bc_offset_ms) || 0);
  if (event.bc_state === "idle") return { state: "open", elapsedMs: 0, countdownMs: 0 };
  if (event.bc_state === "paused") return { state: "paused", elapsedMs: offset, countdownMs: 0 };
  if (event.bc_state === "finished") return { state: "finished", elapsedMs: offset, countdownMs: 0 };
  const started = Date.parse(event.bc_started_at || "");
  if (!Number.isFinite(started)) return { state: "open", elapsedMs: offset, countdownMs: 0 };
  const delta = nowMs - started;
  if (delta < countdownMs) return { state: "countdown", elapsedMs: offset, countdownMs: countdownMs - Math.max(0, delta) };
  return { state: "running", elapsedMs: offset + delta - countdownMs, countdownMs: 0 };
}
