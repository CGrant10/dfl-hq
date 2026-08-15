import { Application, Container } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";

/**
 * PixiJS renderer boundary for the Arena migration.
 *
 * The deterministic simulation remains independent of Pixi. This class only
 * owns presentation, so the DOM renderer can remain the production fallback
 * until sprite conversion and device validation are complete.
 */
export class PixiRaceStage implements RaceRenderer {
  readonly app = new Application();
  readonly scenery = new Container({ label: "scenery" });
  readonly course = new Container({ label: "course" });
  readonly actors = new Container({ label: "racers" });
  readonly effects = new Container({ label: "effects" });
  readonly overlay = new Container({ label: "overlay" });

  #host: HTMLElement | null = null;
  #racers: readonly RaceRacer[] = [];
  #actorById = new Map<RaceRacer["id"], Container>();

  async mount(host: HTMLElement): Promise<void> {
    this.#host = host;
    await this.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.app.canvas.className = "arena-pixi-canvas";
    this.app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.app.canvas);
    this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay);
  }

  setRacers(racers: readonly RaceRacer[]): void {
    this.#racers = racers;
    this.#actorById.clear();
    this.actors.removeChildren();
    for (const racer of racers) {
      const actor = new Container({ label: `racer-${racer.id}` });
      actor.eventMode = "none";
      this.#actorById.set(racer.id, actor);
      this.actors.addChild(actor);
    }
  }

  render(frame: RaceFrame): void {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    const top = height * 0.1;
    const laneSpan = height * 0.8;
    const count = Math.max(1, this.#racers.length);

    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      actor.x = width * (0.03 + Math.min(1, Math.max(0, racer.progress)) * 0.88);
      actor.y = top + laneSpan * ((racer.lane + 0.5) / count);
      actor.alpha = frame.state === "idle" ? 0.9 : 1;
    }
  }

  resize(): void {
    this.app.resize();
  }

  destroy(): void {
    this.#actorById.clear();
    this.#racers = [];
    this.app.destroy(true, { children: true });
    this.#host = null;
  }
}
