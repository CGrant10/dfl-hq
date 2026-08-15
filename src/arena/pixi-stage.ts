import { Application, Container, Graphics, Text } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { normalizePet, petMotion, type ArenaPet, type PetMotion } from "./pet-texture";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";
import { CHARACTERS, GRID_H, GRID_W } from "../../js/arena/dfl-sprites.js";

const PIXEL_SIZE = 3;

interface PetActor {
  root: Container;
  art: Container;
  frames: readonly [Graphics, Graphics];
}

/**
 * GPU racer presentation only. The pre-migration DOM remains responsible for
 * the Arena composition and the deterministic engine remains authoritative.
 */
export class PixiRaceStage implements RaceRenderer {
  readonly app = new Application();
  // Retain the established Pixi feature set so the existing split runtime
  // chunks remain cache-compatible; these layers stay empty for DOM parity.
  readonly scenery = new Container({ label: "scenery" });
  readonly course = new Container({ label: "course" });
  readonly actors = new Container({ label: "racers" });
  readonly effects = new Container({ label: "effects" });
  readonly overlay = new Container({ label: "overlay" });
  readonly #compatGraphics = new Graphics({ label: "legacy-feature-set" });
  readonly #compatText = new Text({ text: "", style: { fill: 0xffffff, fontFamily: "monospace", fontSize: 12 } });
  #host: HTMLElement | null = null;
  #viewport: ArenaViewport = arenaViewport(1280, 720);
  #racers: readonly RaceRacer[] = [];
  #actorById = new Map<RaceRacer["id"], PetActor>();
  #lastFrame: RaceFrame | null = null;
  #resizeObserver: ResizeObserver | null = null;

  async mount(host: HTMLElement): Promise<void> {
    this.#host = host;
    await this.app.init({
      resizeTo: host,
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      preference: "webgl",
    });
    this.app.canvas.className = "arena-pixi-canvas";
    this.app.canvas.setAttribute("aria-hidden", "true");
    host.appendChild(this.app.canvas);
    this.scenery.addChild(this.#compatGraphics);
    this.overlay.addChild(this.#compatText);
    this.app.stage.addChild(this.scenery, this.course, this.actors, this.effects, this.overlay);
    this.resize();
    if (typeof ResizeObserver === "function") {
      this.#resizeObserver = new ResizeObserver(() => this.resize());
      this.#resizeObserver.observe(host);
    }
  }

  async setRacers(racers: readonly RaceRacer[]): Promise<void> {
    this.#racers = racers;
    this.#actorById.clear();
    this.actors.removeChildren();
    for (const racer of racers) {
      const root = new Container({ label: `racer-${racer.id}` });
      root.eventMode = "none";
      const pet = normalizePet(racer.pet, racer.color);
      const frames = this.#petFrames(pet);
      const art = new Container({ label: `pet-${pet.species}` });
      art.addChild(...frames);
      root.addChild(art);
      this.#actorById.set(racer.id, { root, art, frames });
      this.actors.addChild(root);
    }
  }

  render(frame: RaceFrame): void {
    this.#lastFrame = frame;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      const winner = racer.finished && racer.id === frame.winnerId;
      const motion = winner ? "win" : racer.finished ? "idle" : petMotion(racer.reaction, false, frame.state);
      const phase = this.#motionPhase(frame.elapsedMs, racer.lane, frame.heat, motion);

      actor.root.position.set(
        screenX(this.#viewport, racer.progress),
        laneY(this.#viewport, racer.lane, this.#racers.length),
      );
      actor.root.scale.set(this.#viewport.actorScale);
      actor.root.rotation = 0;
      actor.root.alpha = 1;
      actor.art.position.set(phase.x, reducedMotion ? 0 : phase.y);
      actor.art.scale.set(reducedMotion ? 1 : phase.scale);
      actor.art.rotation = reducedMotion ? 0 : phase.rotation;

      const frameDuration = motion === "surge" || motion === "duel" ? 260
        : motion === "stumble" ? 900
        : motion === "win" ? 380
        : this.#viewport.width >= 801 ? 380 : 620;
      const strideFrame = !reducedMotion && Math.floor(frame.elapsedMs / frameDuration) % 2 === 1;
      actor.frames[0].visible = !strideFrame;
      actor.frames[1].visible = strideFrame;
    }
  }

  resize(): void {
    if (!this.#host) return;
    this.app.resize();
    this.#viewport = arenaViewport(this.app.screen.width, this.app.screen.height);
    if (this.#lastFrame) this.render(this.#lastFrame);
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#actorById.clear();
    this.#racers = [];
    this.#lastFrame = null;
    this.app.destroy(true, { children: true });
    this.#host = null;
  }

  #motionPhase(elapsedMs: number, lane: number, heat: number, motion: PetMotion): { x: number; y: number; scale: number; rotation: number } {
    const heatRate = 1 + Math.max(0, Math.min(3, heat)) * 0.16;
    const wave = Math.sin(elapsedMs * 0.015 * heatRate + lane * 0.7);
    if (motion === "surge" || motion === "duel") {
      return { x: 0, y: -2 - wave, scale: 1.07 + wave * 0.01, rotation: wave * Math.PI / 90 };
    }
    if (motion === "stumble") {
      return { x: wave < 0 ? -2 : 1, y: 0, scale: 1, rotation: wave * Math.PI / 30 };
    }
    if (motion === "jump") {
      return { x: 0, y: -1 - Math.abs(wave) * 3, scale: 1.06 + Math.abs(wave) * 0.06, rotation: -Math.abs(wave) * Math.PI / 60 };
    }
    if (motion === "win") {
      return { x: 0, y: -Math.abs(wave) * 7, scale: 1 + Math.abs(wave) * 0.12, rotation: 0 };
    }
    if (motion === "run") {
      return { x: 0, y: -Math.abs(wave) * 2, scale: 1, rotation: wave * Math.PI / 120 };
    }
    return { x: 0, y: -0.75 - wave * 0.75, scale: 1, rotation: 0 };
  }

  #petFrames(pet: ArenaPet): readonly [Graphics, Graphics] {
    let hash = 0;
    for (const char of pet.species) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    const character = CHARACTERS.find((item) => item.id === pet.species) || CHARACTERS[hash % CHARACTERS.length]!;
    return [
      this.#drawPet(character.px, character.palette as Record<string, string>, pet),
      this.#drawPet(this.#strideFrame(character.px), character.palette as Record<string, string>, pet),
    ];
  }

  #drawPet(rows: readonly string[], palette: Record<string, string>, pet: ArenaPet): Graphics {
    const body = this.#color(pet.color);
    const accent = this.#color(pet.accent);
    const graphic = new Graphics();
    const cell = (x: number, y: number, color: number) => graphic
      .rect((x - GRID_W / 2) * PIXEL_SIZE, (y - GRID_H / 2) * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
      .fill(color);

    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const key = row[x]!;
        if (key === "." || key === " ") continue;
        cell(x, y, key === "L" ? body : this.#color(palette[key] || pet.color));
      }
    });
    this.#drawCosmetics(cell, pet, accent);
    return graphic;
  }

  #drawCosmetics(cell: (x: number, y: number, color: number) => void, pet: ArenaPet, accent: number): void {
    const row = (x1: number, x2: number, y: number, color = accent) => {
      for (let x = x1; x <= x2; x++) cell(x, y, color);
    };
    if (pet.accessory === "bandana") {
      row(6, 17, 8); row(6, 17, 9); row(17, 19, 10); row(17, 19, 11);
    } else if (pet.accessory === "visor") {
      row(7, 17, 4); row(7, 17, 5); row(17, 19, 6);
    } else if (pet.accessory === "crown") {
      row(8, 9, 1); row(12, 13, 1); row(16, 17, 1);
      row(8, 9, 2); row(12, 13, 2); row(16, 17, 2);
      for (let y = 3; y <= 5; y++) row(8, 17, y);
    } else if (pet.accessory === "headphones") {
      row(8, 17, 2); row(8, 17, 3);
      for (let y = 4; y <= 8; y++) { row(6, 7, y); row(18, 19, y); }
    } else if (pet.accessory === "cape") {
      for (let y = 7; y <= 10; y++) row(4, 6, y);
      for (let y = 11; y <= 12; y++) row(2, 6, y);
    }

    const ink = 0x17191f;
    if (pet.expression === "happy") {
      cell(10, 6, ink); cell(15, 6, ink); row(12, 14, 9, ink);
    } else if (pet.expression === "fierce") {
      row(9, 11, 6, ink); row(14, 16, 6, ink); row(12, 14, 9, ink);
    } else if (pet.expression === "sleepy") {
      row(9, 11, 7, ink); row(14, 16, 7, ink);
    }
  }

  #strideFrame(rows: readonly string[]): string[] {
    return rows.map((row, y) => {
      if (y < 9) return row;
      return y % 2 ? `.${row.slice(0, GRID_W - 1)}` : `${row.slice(1)}.`;
    });
  }

  #color(value: string): number {
    const parsed = Number.parseInt(value.replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x38bdf8;
  }
}
