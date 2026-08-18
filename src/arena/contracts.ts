export type RaceState = "idle" | "running" | "paused" | "finished";
export type RaceLength = "short" | "medium" | "long" | "custom";

export interface SharedRaceEvent {
  id: number;
  seed: number | null;
  race_length: RaceLength | string;
  length_ticks: number | null;
  bc_state: RaceState;
  bc_started_at: string | null;
  bc_offset_ms: number;
  bc_show_board: boolean;
  bc_show_timer: boolean;
}

export interface RacePet {
  name?: string;
  species: string;
  color: string;
  accent: string;
  trail: string;
  accessory?: string;
  expression?: string;
}

export interface RaceRacer {
  id: string | number;
  name: string;
  number: number;
  color: string;
  pet: RacePet | null;
}

export interface RacerFrame {
  id: RaceRacer["id"];
  progress: number;
  lane: number;
  leading: boolean;
  finished: boolean;
  /** Presentation-only travel beyond the stripe; authoritative progress stays 0..1. */
  displayProgress?: number;
  exiting?: boolean;
  /** Presentation-only normalized velocity/acceleration from authoritative frames. */
  speed?: number;
  acceleration?: number;
  reaction?: "surge" | "stumble" | "jump" | "duel" | "near";
  /** Presentation timestamp only; race progress remains authoritative. */
  reactionStartedMs?: number;
}

export type FinishCameraState = "normal" | "finalStretch" | "finish";

export interface FinishCamera {
  state: FinishCameraState;
  mix: number;
  finishRatio: number;
}

export interface PhotoFinishPresentation {
  phase: "approach" | "flash" | "result";
  firstId: RaceRacer["id"];
  secondId: RaceRacer["id"];
  firstName: string;
  secondName: string;
  firstMs: number;
  secondMs: number;
  gapMs: number;
}

export interface FinishPresentation {
  camera: FinishCamera;
  visualElapsedMs: number;
  /*
    Has the viewer actually SEEN the race being decided yet? Every graphic
    that resolves it - winner card, first-place emphasis, winner focus,
    photo-finish result - is gated on this and nothing else.
  */
  crossingShown: boolean;
  crossingShownMs: number;
  celebrationActive: boolean;
  celebrationStartedMs: number;
  allExited: boolean;
  photoFinish?: PhotoFinishPresentation;
}

export interface RaceFrame {
  elapsedMs: number;
  state: RaceState;
  heat: 0 | 1 | 2 | 3;
  racers: readonly RacerFrame[];
  countdownMs?: number;
  winnerId?: RaceRacer["id"];
  finish?: FinishPresentation;
  /** Explicit local Arena preference; absent/false always means full effects. */
  reduceMotionEffects?: boolean;
}

export interface RaceRenderer {
  mount(host: HTMLElement): Promise<void>;
  setRacers(racers: readonly RaceRacer[]): Promise<void>;
  render(frame: RaceFrame): void;
  resize(): void;
  destroy(): void;
}
