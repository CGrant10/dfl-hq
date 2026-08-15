import { Application, Container, Graphics } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";

const SKY = 0x09142f;
const TRACK = 0x16264f;
const LANE = 0x8bbcff;
const SPEED = 0xb8e8ff;

/** GPU presentation only; the deterministic engine remains authoritative. */
export class PixiRaceStage implements RaceRenderer {
  readonly app = new Application();
  readonly scenery = new Container({ label: "scenery" });
  readonly course = new Container({ label: "course" });
  readonly actors = new Container({ label: "racers" });
  readonly effects = new Container({ label: "effects" });
  readonly overlay = new Container({ label: "overlay" });
  readonly #sky = new Graphics({ label: "sky" });
  readonly #track = new Graphics({ label: "track" });
  readonly #laneLines = new Graphics({ label: "lane-lines" });
  readonly #finish = new Graphics({ label: "finish-line" });
  readonly #speedLines = new Graphics({ label: "speed-lines" });
  #host: HTMLElement | null = null;
  #viewport: ArenaViewport = arenaViewport(1280, 720);
  #racers: readonly RaceRacer[] = [];
  #actorById = new Map<RaceRacer["id"], Container>();
  #lastFrame: RaceFrame | null = null;

  async mount(host: HTMLElement): Promise<void> {
    this.#host = host;
    await this.app.init({
      resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), preference: "webgl",
    });
    this.app.canvas.className = "arena-pixi-canvas";
    this.app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.app.canvas);
    this.scenery.addChild(this.#sky);
    this.course.addChild(this.#track, this.#laneLines, this.#finish);
    this.effects.addChild(this.#speedLines);
    this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay);
    this.resize();
  }

  setRacers(racers: readonly RaceRacer[]): void {
    this.#racers = racers;
    this.#actorById.clear();
    this.actors.removeChildren();
    for (const racer of racers) {
      const actor = new Container({ label: `racer-${racer.id}` });
      actor.eventMode = "none";
      const shadow = new Graphics().ellipse(0, 13, 22, 7).fill({ color: 0x000000, alpha: 0.34 });
      const marker = new Graphics().roundRect(-15, -18, 30, 32, 8)
        .fill({ color: this.#color(racer.color), alpha: 1 })
        .stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
      actor.addChild(shadow, marker);
      this.#actorById.set(racer.id, actor);
      this.actors.addChild(actor);
    }
    this.#drawCourse();
  }

  render(frame: RaceFrame): void {
    this.#lastFrame = frame;
    const intensity = frame.state === "running" ? Math.min(1, frame.heat / 3) : 0;
    this.#drawSpeedField(frame.elapsedMs, intensity);
    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      actor.x = screenX(this.#viewport, racer.progress);
      actor.y = laneY(this.#viewport, racer.lane, this.#racers.length);
      actor.scale.set(this.#viewport.actorScale * (racer.leading ? 1.08 : 1));
      actor.rotation = frame.state === "running" ? Math.sin(frame.elapsedMs * 0.018 + racer.lane) * 0.035 : 0;
      actor.alpha = frame.state === "idle" ? 0.9 : 1;
    }
    const shake = frame.state === "running" ? intensity * Math.sin(frame.elapsedMs * 0.055) * 2.2 : 0;
    this.course.y = shake;
    this.actors.y = -shake * 0.35;
  }

  resize(): void {
    this.app.resize();
    this.#viewport = arenaViewport(this.app.screen.width, this.app.screen.height);
    this.#drawCourse();
    if (this.#lastFrame) this.render(this.#lastFrame);
  }

  destroy(): void {
    this.#actorById.clear();
    this.#racers = [];
    this.#lastFrame = null;
    this.app.destroy(true, { children: true });
    this.#host = null;
  }

  #drawCourse(): void {
    const v = this.#viewport;
    this.#sky.clear().rect(0, 0, v.width, v.height).fill(SKY);
    this.#track.clear().rect(0, v.laneTop, v.width, v.laneHeight).fill(TRACK);
    this.#laneLines.clear();
    const count = Math.max(1, this.#racers.length);
    for (let lane = 1; lane < count; lane++) {
      const y = v.laneTop + v.laneHeight * (lane / count);
      this.#laneLines.moveTo(0, y).lineTo(v.width, y).stroke({ color: LANE, alpha: 0.13, width: 1 });
    }
    this.#finish.clear();
    const size = Math.max(7, Math.min(16, v.width / 72));
    for (let row = 0; row < Math.ceil(v.laneHeight / size); row++) {
      for (let col = 0; col < 2; col++) {
        this.#finish.rect(v.trackRight - size + col * size, v.laneTop + row * size, size, size)
          .fill({ color: (row + col) % 2 ? 0xffffff : 0x111827, alpha: 0.95 });
      }
    }
  }

  #drawSpeedField(elapsedMs: number, intensity: number): void {
    const v = this.#viewport;
    const travel = (elapsedMs * (0.28 + intensity * 0.72)) % Math.max(1, v.width);
    this.#speedLines.clear();
    const count = Math.round(10 + intensity * 22);
    for (let i = 0; i < count; i++) {
      const x = ((i * 97.3) % v.width - travel + v.width) % v.width;
      const y = v.laneTop + ((i * 53) % Math.max(1, v.laneHeight));
      const length = 22 + (i % 5) * 18 + intensity * 90;
      this.#speedLines.moveTo(x, y).lineTo(x - length, y)
        .stroke({ color: SPEED, alpha: 0.08 + intensity * 0.22, width: 1 + intensity * 2 });
    }
  }

  #color(value: string): number {
    const parsed = Number.parseInt(value.replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x38bdf8;
  }
}
