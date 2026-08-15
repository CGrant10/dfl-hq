import type { RacerFrame, RaceRacer } from "./contracts";

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
  timeline?: ReactionTimeline;
}

/** One authoritative adapter from deterministic samples to a Pixi racer. */
export function presentationRacerFrame(input: PresentationRacerInput): RacerFrame {
  const lo = Math.max(0, Math.min(input.samples.length - 1, input.lo));
  const hi = Math.max(lo, Math.min(input.samples.length - 1, input.hi));
  const mix = Math.max(0, Math.min(1, input.mix));
  const atLo = input.samples[lo] ?? 0;
  const atHi = input.samples[hi] ?? atLo;
  const previous = input.samples[Math.max(0, lo - 1)] ?? atLo;
  const progress = input.elapsedMs <= 0 ? 0 : atLo + (atHi - atLo) * mix;
  const speed = Math.max(0, Math.min(1, (atHi - atLo) * 180));
  const acceleration = Math.max(-1, Math.min(1,
    ((atHi - atLo) - (atLo - previous)) * 500));
  const finished = Boolean(input.finished) || progress >= 1;
  const reaction = finished ? null : reactionAt(input.timeline, input.lane, input.elapsedMs);
  return {
    id: input.id,
    lane: input.lane,
    progress,
    leading: false,
    finished,
    speed,
    acceleration,
    ...(reaction ? { reaction: reaction.kind, reactionStartedMs: reaction.startedMs } : {}),
  };
}
