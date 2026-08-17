import { PixiRaceStage } from "./pixi-stage";
import type { RaceFrame, RaceRacer } from "./contracts";

export { backgroundMotion } from "./background-motion";
/* The shared character composition. Consumed by the SVG emitter in
   js/arena/sprites.js, the profile preview, and PixiRaceStage. */
export {
  ACCESSORY_KEYS, EXPRESSION_KEYS, characterIds, characterSvg,
  composeCharacter, normalizeCharacter, runsToPaths, silhouetteRuns,
} from "./character";
export { createReactionTimeline, presentationRacerFrame, reactionAt } from "./presentation-frame";
export { createFinishPresentation, finishPassProgress, presentationScreenRatio } from "./finish-presentation";
/* The theatre layer, ported out of js/arena/race.js into typed, tested
   modules. Both the Arena stage and the shared viewer consume it from here. */
export {
  allowance, arcShape, closingEase, crossingSpeeds, dramatize, launchEase, openEase, planArcs,
  MAX_DROP, MAX_LEAD,
  coastProgress, finishPhase, finishTrajectories, presentFinish, settleOffset,
} from "./theatre";

export interface LiveArenaRenderer {
  render(frame: RaceFrame): void;
  destroy(): void;
}

const activeRenderers = new WeakMap<HTMLElement, LiveArenaRenderer>();

export async function createArenaRenderer(parent: HTMLElement, racers: readonly RaceRacer[]): Promise<LiveArenaRenderer | null> {
  if (!parent) return null;
  // A reconnect/replay must never leave two Pixi canvases on the same Arena.
  activeRenderers.get(parent)?.destroy();
  const track = parent.querySelector<HTMLElement>(".track") || parent;
  // Keep the proven DOM composition and controls. Only the legacy character
  // artwork is replaced after Pixi has mounted successfully; everything is
  // restored automatically if Pixi cannot start.
  const fallbackChildren = Array.from(track.querySelectorAll<HTMLElement>(".runner-art, .bc-runner-art"));
  const previousVisibility = new Map(fallbackChildren.map((child) => [child, {
    value: child.style.getPropertyValue("visibility"),
    priority: child.style.getPropertyPriority("visibility"),
    ariaHidden: child.getAttribute("aria-hidden"),
  }]));
  const host = document.createElement("div");
  host.className = "arena-pixi-host";
  Object.assign(host.style, { position: "absolute", inset: "0", zIndex: "1", overflow: "hidden", pointerEvents: "none" });
  if (getComputedStyle(track).position === "static") track.style.position = "relative";
  track.appendChild(host);
  const stage = new PixiRaceStage();
  try {
    await stage.mount(host);
    // Mount is the handoff boundary. Hide fallback art before actors are added
    // so the Pixi ticker can never paint a second visible racer set.
    // Important priority defeats legacy animation selectors while the parent
    // class provides a second, CSS-level guarantee.
    for (const child of fallbackChildren) {
      child.style.setProperty("visibility", "hidden", "important");
      child.setAttribute("aria-hidden", "true");
    }
    parent.classList.add("has-pixi-race");
    await stage.setRacers(racers);
    stage.render({
      elapsedMs: 0, state: "idle", heat: 0,
      racers: racers.map((racer, lane) => ({ id: racer.id, progress: 0, lane, leading: false, finished: false })),
    });
    let destroyed = false;
    const live: LiveArenaRenderer = {
      render: (frame) => { if (!destroyed) stage.render(frame); },
      destroy: () => {
        if (destroyed) return;
        destroyed = true;
        stage.destroy(); host.remove(); parent.classList.remove("has-pixi-race");
        for (const child of fallbackChildren) {
          const previous = previousVisibility.get(child);
          child.style.setProperty("visibility", previous?.value || "", previous?.priority || "");
          if (previous?.ariaHidden == null) child.removeAttribute("aria-hidden");
          else child.setAttribute("aria-hidden", previous.ariaHidden);
        }
        if (activeRenderers.get(parent) === live) activeRenderers.delete(parent);
      },
    };
    activeRenderers.set(parent, live);
    return live;
  } catch (error) {
    console.warn("Pixi Arena unavailable; using DOM renderer", error);
    try { stage.destroy(); } catch { /* initialization may be partial */ }
    host.remove();
    parent.classList.remove("has-pixi-race");
    for (const child of fallbackChildren) {
      const previous = previousVisibility.get(child);
      child.style.setProperty("visibility", previous?.value || "", previous?.priority || "");
      if (previous?.ariaHidden == null) child.removeAttribute("aria-hidden");
      else child.setAttribute("aria-hidden", previous.ariaHidden);
    }
    return null;
  }
}
