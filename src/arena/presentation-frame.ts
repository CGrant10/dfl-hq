import type { RacerFrame, RaceRacer } from "./contracts";
import { POST_FINISH_MS } from "./finish-presentation";

export type ReactionKind = NonNullable<RacerFrame["reaction"]>;

export interface TimedReaction {
  kind: ReactionKind;
  startedMs: number;
  untilMs: number;
}

export type ReactionTimeline = readonly (readonly TimedReaction[])[];

interface DramaEventLike {
  kind: string;
  racer: number;
  ms: number;
  durMs: number;
}

interface VisualEventLike extends DramaEventLike {
  other?: number;
}

const priority: readonly ReactionKind[] = ["stumble", "jump", "duel", "near", "surge"];

/**
 * The last half-second is a runway, not a presentation effect.
 *
 * Once a racer enters this window we carry its drawn position to 1.0 at a
 * constant rate. Nothing at the finish line is allowed to ease, hold, or
 * visually park the racer before the authoritative crossing time.
 */
const FINAL_RUN_MS = 500;
const SAMPLE_MS = 40;

/**
 * Converts the deterministic race theatre queues into a seekable Pixi
 * timeline. Arena, shared viewer and Broadcast can now reconstruct the same
 * active reactions directly from elapsed time, including after reconnect.
 */
export function createReactionTimeline(
  dramaEvents: readonly DramaEventLike[],
  visualEvents: readonly VisualEventLike[],
  racerCount: number,
): ReactionTimeline {
  const timeline: TimedReaction[][] = Array.from({ length: Math.max(0, racerCount) }, () => []);
  const add = (lane: number | undefined, kind: ReactionKind, startedMs: number, durationMs: number) => {
    if (lane == null || lane < 0 || lane >= timeline.length) return;
    timeline[lane]?.push({ kind, startedMs, untilMs: startedMs + Math.max(0, durationMs) });
  };

  for (const event of dramaEvents) {
    add(event.racer, event.kind === "stumble" ? "stumble" : "surge", event.ms, event.durMs);
  }
  for (const event of visualEvents) {
    if (event.kind === "jump") add(event.racer, "jump", event.ms, event.durMs);
    else if (event.kind === "swap") {
      add(event.racer, "duel", event.ms, event.durMs);
      add(event.other, "duel", event.ms, event.durMs);
    } else if (event.kind === "near") {
      add(event.racer, "near", event.ms, event.durMs);
      add(event.other, "near", event.ms, event.durMs);
    }
  }
  for (const lane of timeline) lane.sort((a, b) => a.startedMs - b.startedMs);
  return timeline;
}

export function reactionAt(timeline: ReactionTimeline | undefined, lane: number, elapsedMs: number): TimedReaction | null {
  const active = (timeline?.[lane] || []).filter((item) => elapsedMs >= item.startedMs && elapsedMs < item.untilMs);
  for (const kind of priority) {
    const match = active.find((item) => item.kind === kind);
    if (match) return match;
  }
  return null;
}

export interface PresentationRacerInput {
  id: RaceRacer["id"];
  lane: number;
  samples: readonly number[];
  lo: number;
  hi: number;
  mix: number;
  elapsedMs: number;
  finished?: boolean;
  officialFinishMs?: number;
  timeline?: ReactionTimeline;
}

function finalRunProgress(input: PresentationRacerInput, normalProgress: number): number {
  const finishMs = input.officialFinishMs;
  if (finishMs == null || !Number.isFinite(finishMs)) return normalProgress;
  const startMs = finishMs - FINAL_RUN_MS;
  if (input.elapsedMs <= startMs || input.elapsedMs >= finishMs) return normalProgress;

  const anchorIndex = Math.max(0, Math.min(input.samples.length - 1, Math.floor(startMs / SAMPLE_MS)));
  const anchor = Math.max(0, Math.min(0.999999, input.samples[anchorIndex] ?? normalProgress));
  const phase = Math.max(0, Math.min(1, (input.elapsedMs - startMs) / FINAL_RUN_MS));
  return anchor + (1 - anchor) * phase;
}

/** One authoritative adapter from deterministic samples to a Pixi racer. */
export function presentationRacerFrame(input: PresentationRacerInput): RacerFrame {
  const lo = Math.max(0, Math.min(input.samples.length - 1, input.lo));
  const hi = Math.max(lo, Math.min(input.samples.length - 1, input.hi));
  const mix = Math.max(0, Math.min(1, input.mix));
  const atLo = input.samples[lo] ?? 0;
  const atHi = input.samples[hi] ?? atLo;
  const previous = input.samples[Math.max(0, lo - 1)] ?? atLo;
  const sampledProgress = input.elapsedMs <= 0 ? 0 : atLo + (atHi - atLo) * mix;
  const progress = finalRunProgress(input, sampledProgress);
  const speed = Math.max(0, Math.min(1, (atHi - atLo) * 180));
  const acceleration = Math.max(-1, Math.min(1,
    ((atHi - atLo) - (atLo - previous)) * 500));
  const finished = input.officialFinishMs == null
    ? Boolean(input.finished) || progress >= 1
    : input.elapsedMs >= input.officialFinishMs;
  const displayProgress = progress;
  const exiting = finished && input.officialFinishMs != null && input.elapsedMs < input.officialFinishMs + POST_FINISH_MS;
  const reaction = finished ? null : reactionAt(input.timeline, input.lane, input.elapsedMs);
  return {
    id: input.id,
    lane: input.lane,
    progress,
    displayProgress,
    leading: false,
    finished,
    exiting,
    speed: exiting ? Math.max(0.72, speed) : speed,
    acceleration,
    ...(reaction ? { reaction: reaction.kind, reactionStartedMs: reaction.startedMs } : {}),
  };
}
