import { Application, Container, Graphics, Text } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { normalizePet, petMotion, type ArenaPet, type PetMotion } from "./pet-texture";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";
import { motionPose, racerVariant } from "./animation";
import { effectDensity, effectSample } from "./effects";
import { CHARACTERS, GRID_H, GRID_W } from "../../js/arena/dfl-sprites.js";

const PIXEL_SIZE = 3;

interface PetActor {
  root: Container;
  art: Container;
  frames: readonly [Graphics, Graphics];
  ghosts: readonly [Container, Container];
  ghostFrames: readonly [readonly [Graphics, Graphics], readonly [Graphics, Graphics]];
  fx: Graphics;
  color: number;
  variant: number;
  motion: PetMotion;
  motionStartedMs: number;
  finishedAtMs: number | null;
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
  readonly #speedLines = new Graphics({ label: "speed-lines" });
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
    this.effects.addChild(this.#speedLines);
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
      const ghostFrames = [this.#petFrames(pet), this.#petFrames(pet)] as const;
      const ghosts = ghostFrames.map((pair, index) => {
        const ghost = new Container({ label: `afterimage-${index + 1}` });
        ghost.addChild(...pair);
        ghost.visible = false;
        return ghost;
      }) as unknown as readonly [Container, Container];
      const fx = new Graphics({ label: `effects-${racer.id}` });
      root.addChild(...ghosts, fx, art);
      this.#actorById.set(racer.id, {
        root, art, frames, ghosts, ghostFrames, fx,
        color: this.#color(pet.accent),
        variant: racerVariant(racer.id, racers.indexOf(racer)),
        motion: "idle",
        motionStartedMs: 0,
        finishedAtMs: null,
      });
      this.actors.addChild(root);
    }
  }

  render(frame: RaceFrame): void {
    this.#lastFrame = frame;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    this.#drawSpeedLines(frame, reducedMotion);
    let shake = 0;
    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      const winner = racer.finished && racer.id === frame.winnerId;
      const motion = winner ? "win" : racer.finished ? "idle" : petMotion(racer.reaction, false, frame.state);
      if (winner && actor.finishedAtMs == null) actor.finishedAtMs = frame.elapsedMs;
      if (!racer.finished) actor.finishedAtMs = null;
      if (actor.motion !== motion) {
        actor.motion = motion;
        actor.motionStartedMs = racer.reactionStartedMs ?? actor.finishedAtMs ?? frame.elapsedMs;
      } else if (racer.reactionStartedMs != null) {
        actor.motionStartedMs = racer.reactionStartedMs;
      }
      const phase = motionPose({
        motion,
        elapsedMs: frame.elapsedMs,
        motionStartedMs: actor.motionStartedMs,
        lane: racer.lane,
        heat: frame.heat,
        variant: actor.variant,
        reducedMotion,
      });

      actor.root.position.set(
        screenX(this.#viewport, racer.progress),
        laneY(this.#viewport, racer.lane, this.#racers.length),
      );
      actor.root.scale.set(this.#viewport.actorScale);
      actor.root.rotation = 0;
      actor.root.alpha = 1;
      actor.art.position.set(phase.x, phase.y);
      actor.art.scale.set(phase.scaleX, phase.scaleY);
      actor.art.rotation = phase.rotation;

      const strideFrame = !reducedMotion && Math.floor(frame.elapsedMs / phase.strideMs) % 2 === 1;
      actor.frames[0].visible = !strideFrame;
      actor.frames[1].visible = strideFrame;
      this.#drawActorEffects(actor, phase, strideFrame, frame.elapsedMs, frame.state, reducedMotion);
      shake = Math.max(shake, phase.impact);
    }
    // Running-only, sub-pixel canvas shake. It cannot reflow or resize the DOM.
    const allowShake = frame.state === "running" && !reducedMotion && frame.heat >= 2;
    this.actors.position.set(allowShake ? Math.sin(frame.elapsedMs * 0.09) * shake * 1.15 : 0,
      allowShake ? Math.cos(frame.elapsedMs * 0.11) * shake * 0.7 : 0);
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

  #drawSpeedLines(frame: RaceFrame, reducedMotion: boolean): void {
    this.#speedLines.clear();
    if (frame.state !== "running") return;
    const count = effectDensity(frame.heat, this.#viewport.compact, reducedMotion);
    const bucket = Math.floor(frame.elapsedMs / 90);
    for (let i = 0; i < count; i++) {
      const sample = effectSample(bucket, frame.heat, i);
      const x = sample.x * this.#viewport.width;
      const y = sample.y * this.#viewport.height;
      const length = (22 + this.#viewport.width * 0.075 * sample.length) * (0.65 + frame.heat * 0.18);
      this.#speedLines.moveTo(x, y).lineTo(x - length, y)
        .stroke({ color: 0xffffff, width: sample.length > 0.7 ? 2 : 1, alpha: sample.alpha * 0.16 });
    }
  }

  #drawActorEffects(
    actor: PetActor,
    phase: ReturnType<typeof motionPose>,
    strideFrame: boolean,
    elapsedMs: number,
    state: RaceFrame["state"],
    reducedMotion: boolean,
  ): void {
    actor.fx.clear();
    const active = state === "running" || state === "finished";
    const showAfterimage = active && !reducedMotion && phase.afterimage > 0.08;
    actor.ghosts.forEach((ghost, index) => {
      ghost.visible = showAfterimage;
      ghost.alpha = phase.afterimage * (index === 0 ? 0.27 : 0.13);
      ghost.position.set(phase.x - (index + 1) * (4 + phase.afterimage * 5), phase.y);
      ghost.scale.set(phase.scaleX, phase.scaleY);
      ghost.rotation = phase.rotation;
      actor.ghostFrames[index]![0].visible = !strideFrame;
      actor.ghostFrames[index]![1].visible = strideFrame;
    });
    if (!active || reducedMotion) return;

    if (phase.dust > 0.12) {
      const bucket = Math.floor(elapsedMs / 80);
      for (let i = 0; i < 3; i++) {
        const sample = effectSample(bucket, Math.floor(actor.variant * 12), i);
        const radius = 1.1 + sample.length * 1.7;
        actor.fx.circle(-25 - sample.x * 12, 18 + sample.y * 5, radius)
          .fill({ color: 0xd7c7a4, alpha: phase.dust * sample.alpha * 0.48 });
      }
    }
    if (phase.impact > 0.08) {
      const radius = 18 + phase.impact * 16;
      actor.fx.circle(0, 0, radius).stroke({ color: actor.color, width: 2.4, alpha: phase.impact * 0.58 });
      for (let i = 0; i < 6; i++) {
        const angle = i / 6 * Math.PI * 2 + actor.variant;
        actor.fx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14)
          .lineTo(Math.cos(angle) * (25 + phase.impact * 10), Math.sin(angle) * (25 + phase.impact * 10))
          .stroke({ color: 0xffffff, width: 1.6, alpha: phase.impact * 0.55 });
      }
    }
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

