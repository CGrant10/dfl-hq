import { PixiRaceStage } from "./pixi-stage";
import type { RaceFrame, RaceRacer } from "./contracts";

export interface LiveArenaRenderer {
  render(frame: RaceFrame): void;
  destroy(): void;
}

export async function createArenaRenderer(parent: HTMLElement, racers: readonly RaceRacer[]): Promise<LiveArenaRenderer | null> {
  if (!parent) return null;
  const track = parent.querySelector<HTMLElement>(".track") || parent;
  // Keep the proven DOM composition and controls. Only the legacy character
  // artwork is replaced after Pixi has mounted successfully; everything is
  // restored automatically if Pixi cannot start.
  const fallbackChildren = Array.from(track.querySelectorAll<HTMLElement>(".runner-art"));
  const previousVisibility = new Map(fallbackChildren.map((child) => [child, child.style.visibility]));
  const host = document.createElement("div");
  host.className = "arena-pixi-host";
  Object.assign(host.style, { position: "absolute", inset: "0", zIndex: "1", overflow: "hidden", pointerEvents: "none" });
  if (getComputedStyle(track).position === "static") track.style.position = "relative";
  track.appendChild(host);
  const stage = new PixiRaceStage();
  try {
    await stage.mount(host);
    await stage.setRacers(racers);
    stage.render({
      elapsedMs: 0, state: "idle", heat: 0,
      racers: racers.map((racer, lane) => ({ id: racer.id, progress: 0, lane, leading: false, finished: false })),
    });
    for (const child of fallbackChildren) child.style.visibility = "hidden";
    parent.classList.add("has-pixi-race");
    return { render: (frame) => stage.render(frame), destroy: () => {
      stage.destroy(); host.remove(); parent.classList.remove("has-pixi-race");
      for (const child of fallbackChildren) child.style.visibility = previousVisibility.get(child) || "";
    } };
  } catch (error) {
    console.warn("Pixi Arena unavailable; using DOM renderer", error);
    try { stage.destroy(); } catch { /* initialization may be partial */ }
    host.remove();
    return null;
  }
}
