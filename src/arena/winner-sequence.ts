export interface WinnerPhase {
  freeze: number;
  launch: number;
  celebrate: number;
  converge: number;
  loserReaction: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const pulse = (value: number) => value <= 0 || value >= 1 ? 0 : Math.sin(value * Math.PI);

/** Layout-safe finish choreography; all values are presentation-only. */
export function winnerPhase(ageMs: number): WinnerPhase {
  const age = Math.max(0, ageMs);
  return {
    freeze: age < 115 ? 1 : 0,
    converge: pulse((age - 80) / 520),
    launch: pulse((age - 190) / 620),
    celebrate: age < 720 ? 0 : Math.abs(Math.sin((age - 720) * 0.014)) * clamp01((age - 720) / 280),
    loserReaction: pulse((age - 120) / 760),
  };
}
