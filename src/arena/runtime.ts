import { PixiRaceStage } from "./pixi-stage";
import type { RaceFrame, RaceRacer } from "./contracts";

export interface LiveArenaRenderer {
  render(frame: RaceFrame): void;
  destroy(): void;
}

export async function createArenaRenderer(parent: HTMLElement, racers: readonly RaceRacer[]): Promise<LiveArenaRenderer | null> {
  const host = document.createElement("div");
  host.className = "arena-pixi-host";
  Object.assign(host.style, { position: "absolute", inset: "0", zIndex: "8", overflow: "hidden", pointerEvents: "none" });
  if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
  parent.appendChild(host);
  const stage = new PixiRaceStage();
  try {
    await stage.mount(host);
    stage.setRacers(racers);
    parent.classList.add("has-pixi-race");
    return { render: (frame) => stage.render(frame), destroy: () => { stage.destroy(); host.remove(); parent.classList.remove("has-pixi-race"); } };
  } catch (error) {
    console.warn("Pixi Arena unavailable; using DOM renderer", error);
    try { stage.destroy(); } catch { /* initialization may be partial */ }
    host.remove();
    return null;
  }
}
