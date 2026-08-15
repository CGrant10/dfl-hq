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
  reaction?: "surge" | "stumble" | "jump" | "duel" | "near";
}

export interface RaceFrame {
  elapsedMs: number;
  state: RaceState;
  heat: 0 | 1 | 2 | 3;
  racers: readonly RacerFrame[];
  countdownMs?: number;
  winnerId?: RaceRacer["id"];
}

export interface RaceRenderer {
  mount(host: HTMLElement): Promise<void>;
  setRacers(racers: readonly RaceRacer[]): void;
  render(frame: RaceFrame): void;
  resize(): void;
  destroy(): void;
}
