import { Application, Container, Graphics, Sprite, Text } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { normalizePet, petMotion, petTextureUri } from "./pet-texture";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";

const SKY = 0x09142f;
const TRACK = 0x16264f;
const LANE = 0x8bbcff;
const SPEED = 0xb8e8ff;

interface PetActor {
  root: Container;
  sprite: Sprite;
  trail: Graphics;
  trailKind: string;
  accent: number;
}

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
  readonly #boardPanel = new Graphics({ label: "leaderboard-panel" });
  readonly #boardText = new Text({ text: "", style: { fill: 0xffffff, fontFamily: "monospace", fontSize: 12, lineHeight: 16 } });
  readonly #statusText = new Text({ text: "", style: { fill: 0xffffff, fontFamily: "sans-serif", fontSize: 56, fontWeight: "900", align: "center", stroke: { color: 0x071126, width: 7 } } });
  #host: HTMLElement | null = null;
  #viewport: ArenaViewport = arenaViewport(1280, 720);
  #racers: readonly RaceRacer[] = [];
  #actorById = new Map<RaceRacer["id"], PetActor>();
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
    this.overlay.addChild(this.#boardPanel, this.#boardText, this.#statusText);
    this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay);
    this.resize();
  }

  setRacers(racers: readonly RaceRacer[]): void {
    this.#racers = racers;
    this.#actorById.clear();
    this.actors.removeChildren();
    for (const racer of racers) {
      const root = new Container({ label: `racer-${racer.id}` });
      root.eventMode = "none";
      const pet = normalizePet(racer.pet, racer.color);
      const trail = new Graphics({ label: `trail-${pet.trail}` });
      const shadow = new Graphics().ellipse(0, 13, 22, 7).fill({ color: 0x000000, alpha: 0.34 });
      const sprite = Sprite.from(petTextureUri(pet, racer.color));
      sprite.label = `pet-${pet.species}`;
      sprite.anchor.set(0.5, 0.72);
      sprite.width = 58;
      sprite.height = 58;
      root.addChild(trail, shadow, sprite);
      this.#actorById.set(racer.id, { root, sprite, trail, trailKind: pet.trail, accent: this.#color(pet.accent) });
      this.actors.addChild(root);
    }
    this.#drawCourse();
  }

  render(frame: RaceFrame): void {
    this.#lastFrame = frame;
    const intensity = frame.state === "running" ? Math.min(1, frame.heat / 3) : 0;
    this.#drawSpeedField(frame.elapsedMs, intensity);
    this.#drawOverlay(frame);
    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      const motion = petMotion(racer.reaction, racer.finished, frame.state);
      const stride = Math.sin(frame.elapsedMs * (motion === "surge" ? 0.035 : 0.022) + racer.lane);
      actor.root.x = screenX(this.#viewport, racer.progress);
      actor.root.y = laneY(this.#viewport, racer.lane, this.#racers.length);
      actor.root.scale.set(this.#viewport.actorScale * (racer.leading ? 1.08 : 1));
      actor.root.rotation = motion === "stumble" ? -0.18 : motion === "jump" ? stride * 0.1 : stride * 0.035;
      actor.root.alpha = frame.state === "idle" ? 0.9 : 1;
      actor.sprite.y = motion === "run" || motion === "surge" ? -Math.abs(stride) * (motion === "surge" ? 8 : 4)
        : motion === "jump" ? -14 : motion === "win" ? -Math.abs(stride) * 10 : 0;
      actor.sprite.scale.x = motion === "stumble" ? 1.14 : motion === "surge" ? 1.12 : 1;
      actor.sprite.scale.y = motion === "stumble" ? 0.78 : motion === "jump" ? 1.12 : 1;
      this.#drawTrail(actor, frame.elapsedMs, motion !== "idle");
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

  #drawOverlay(frame: RaceFrame): void {
    const v = this.#viewport;
    const byId = new Map(this.#racers.map((racer) => [racer.id, racer]));
    const rows = [...frame.racers].sort((a, b) => Number(b.finished) - Number(a.finished) || b.progress - a.progress || a.lane - b.lane);
    const panelWidth = Math.min(v.portrait ? 148 : 190, v.width * 0.34);
    const fontSize = v.compact ? 9 : 11;
    const lineHeight = v.compact ? 12 : 15;
    this.#boardPanel.clear().roundRect(8, 8, panelWidth, 12 * lineHeight + 32, 10)
      .fill({ color: 0x061027, alpha: 0.72 }).stroke({ color: 0x8bbcff, alpha: 0.3, width: 1 });
    this.#boardText.style.fontSize = fontSize;
    this.#boardText.style.lineHeight = lineHeight;
    this.#boardText.x = 17;
    this.#boardText.y = 16;
    this.#boardText.text = ["LIVE ORDER", ...rows.slice(0, 12).map((row, index) => {
      const name = byId.get(row.id)?.name || `Racer ${row.lane + 1}`;
      return `${String(index + 1).padStart(2, " ")}  ${name.slice(0, v.portrait ? 12 : 17)}`;
    })].join("\n");

    let status = "";
    if ((frame.countdownMs || 0) > 0) status = String(Math.max(1, Math.ceil(frame.countdownMs! / 1000)));
    else if (frame.state === "paused") status = "PAUSED";
    else if (frame.state === "idle") status = "RACE OPEN";
    else if (frame.state === "finished") {
      const winner = byId.get(frame.winnerId ?? rows[0]?.id ?? "");
      status = winner ? `${winner.name.toUpperCase()} WINS!` : "FINISH!";
    }
    this.#statusText.text = status;
    this.#statusText.style.fontSize = v.portrait ? 34 : v.compact ? 40 : 56;
    this.#statusText.anchor.set(0.5);
    this.#statusText.x = v.width * 0.5;
    this.#statusText.y = v.height * (v.portrait ? 0.07 : 0.08);
  }

  #drawTrail(actor: PetActor, elapsedMs: number, moving: boolean): void {
    actor.trail.clear();
    if (!moving || actor.trailKind === "none") return;
    const pulse = 0.65 + Math.sin(elapsedMs * 0.02) * 0.2;
    if (actor.trailKind === "dust") {
      for (let i = 0; i < 3; i++) actor.trail.circle(-22 - i * 10, 8 + (i % 2) * 5, 4 + i)
        .fill({ color: 0xc8a46b, alpha: pulse * (0.55 - i * 0.1) });
    } else if (actor.trailKind === "spark") {
      for (let i = 0; i < 4; i++) actor.trail.star(-20 - i * 11, (i % 2) * 8, 4, 5, 2)
        .fill({ color: actor.accent, alpha: pulse * (0.8 - i * 0.12) });
    } else if (actor.trailKind === "rainbow") {
      const colors = [0xff4d6d, 0xffd166, 0x63e6be, 0x4dabf7, 0xb197fc];
      colors.forEach((color, i) => actor.trail.moveTo(-16, -8 + i * 4).lineTo(-70, -8 + i * 4)
        .stroke({ color, alpha: pulse * 0.75, width: 3 }));
    }
  }

  #color(value: string): number {
    const parsed = Number.parseInt(value.replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x38bdf8;
  }
}
