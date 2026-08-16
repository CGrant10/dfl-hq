import { Application, Container, Graphics, Text } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { normalizePet, petMotion, type ArenaPet, type PetMotion } from "./pet-texture";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";
import { motionPose, racerVariant } from "./animation";
import { drawAnimeField, drawForegroundRush, drawPhotoFinish, drawWinnerConvergence } from "./anime-effects";
import { drawRacerEffects } from "./racer-effects";
import { pixelPoseRows } from "./pixel-poses";
import { CHARACTERS, GRID_H, GRID_W } from "../../js/arena/dfl-sprites.js";

const PIXEL_SIZE = 3;

interface PetActor {
  root: Container;
  art: Container;
  frames: readonly [Graphics, Graphics, Graphics, Graphics];
  fx: Graphics;
  nameplate: Container;
  color: number;
  variant: number;
  motion: PetMotion;
  motionStartedMs: number;
  finishedAtMs: number | null;
  effectKey: string;
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
  readonly #nameplates = new Container({ label: "mobile-nameplates" });
  readonly #compatGraphics = new Graphics({ label: "legacy-feature-set" });
  readonly #compatText = new Text({ text: "", style: { fill: 0xffffff, fontFamily: "monospace", fontSize: 12 } });
  readonly #backgroundLines = new Graphics({ label: "background-speed-lines" });
  readonly #winnerField = new Graphics({ label: "winner-focus" });
  readonly #foregroundLines = new Graphics({ label: "foreground-speed-lines" });
  readonly #photoField = new Graphics({ label: "photo-finish" });
  readonly #photoText = new Text({
    text: "",
    style: { fill: 0xffffff, fontFamily: "monospace", fontSize: 18, fontWeight: "700", align: "center", lineHeight: 23 },
  });
  #host: HTMLElement | null = null;
  #viewport: ArenaViewport = arenaViewport(1280, 720);
  #racers: readonly RaceRacer[] = [];
  #actorById = new Map<RaceRacer["id"], PetActor>();
  #lastFrame: RaceFrame | null = null;
  #resizeObserver: ResizeObserver | null = null;
  #fieldKey = "";
  #photoKey = "";

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
    // Most velocity treatment lives behind the subject plane so characters
    // remain pixel-crisp. Only a sparse highlight pass crosses in front.
    this.course.addChild(this.#backgroundLines, this.#winnerField);
    this.effects.addChild(this.#foregroundLines);
    this.overlay.addChild(this.#nameplates, this.#photoField, this.#photoText);
    this.#foregroundLines.blendMode = "add";
    this.#winnerField.blendMode = "add";
    this.#photoField.blendMode = "add";
    this.#photoText.anchor.set(0.5);
    this.resize();
    if (typeof ResizeObserver === "function") {
      this.#resizeObserver = new ResizeObserver(() => this.resize());
      this.#resizeObserver.observe(host);
    }
  }

  async setRacers(racers: readonly RaceRacer[]): Promise<void> {
    this.#racers = racers;
    this.app.canvas.dataset.racerCount = String(racers.length);
    this.#actorById.clear();
    this.actors.removeChildren();
    this.#nameplates.removeChildren();
    for (const racer of racers) {
      const root = new Container({ label: `racer-${racer.id}` });
      root.eventMode = "none";
      const pet = normalizePet(racer.pet, racer.color);
      const frames = this.#petFrames(pet);
      const art = new Container({ label: `pet-${pet.species}` });
      art.addChild(...frames);
      const fx = new Graphics({ label: `effects-${racer.id}` });
      const shadow = new Graphics({ label: `contact-${racer.id}` })
        .ellipse(0, 23, 27, 6).fill({ color: 0x000000, alpha: 0.42 });
      const nameplate = this.#nameplate(racer);
      root.addChild(shadow, fx, art);
      this.#actorById.set(racer.id, {
        root, art, frames, fx, nameplate,
        color: this.#color(pet.accent),
        variant: racerVariant(racer.id, racers.indexOf(racer)),
        motion: "idle",
        motionStartedMs: 0,
        finishedAtMs: null,
        effectKey: "",
      });
      this.actors.addChild(root);
      this.#nameplates.addChild(nameplate);
    }
  }

  render(frame: RaceFrame): void {
    this.#lastFrame = frame;
    const reducedMotion = frame.reduceMotionEffects === true;
    const fieldKey = `${Math.floor(frame.elapsedMs / 34)}:${frame.state}:${frame.heat}:${
      Math.round((frame.finish?.camera.mix ?? 0) * 20)}:${reducedMotion}:${this.#viewport.width}:${this.#viewport.height}`;
    if (fieldKey !== this.#fieldKey) {
      this.#fieldKey = fieldKey;
      drawAnimeField(this.#backgroundLines, frame, this.#viewport, reducedMotion);
      drawForegroundRush(this.#foregroundLines, frame, this.#viewport, reducedMotion);
    }
    const photo = frame.finish?.photoFinish;
    const photoKey = `${photo?.phase ?? "none"}:${photo?.gapMs ?? 0}:${this.#viewport.width}:${this.#viewport.height}:${reducedMotion}`;
    if (photoKey !== this.#photoKey) {
      this.#photoKey = photoKey;
      drawPhotoFinish(this.#photoField, this.#photoText, frame, this.#viewport, reducedMotion);
    }
    this.#winnerField.clear();
    let shake = 0;
    let winnerEnergy: { x: number; y: number; intensity: number } | null = null;
    for (const racer of frame.racers) {
      const actor = this.#actorById.get(racer.id);
      if (!actor) continue;
      const celebrationActive = frame.finish?.celebrationActive === true;
      const winner = celebrationActive && racer.finished && racer.id === frame.winnerId;
      const motion: PetMotion = winner ? "win"
        : celebrationActive && racer.finished ? "lose"
        : racer.exiting ? "run"
        : racer.finished ? "idle"
        : petMotion(racer.reaction, false, frame.state);
      if (winner && actor.finishedAtMs == null) actor.finishedAtMs = frame.elapsedMs;
      if (!racer.finished) actor.finishedAtMs = null;
      if (actor.motion !== motion) {
        actor.motion = motion;
        actor.motionStartedMs = celebrationActive
          ? frame.finish?.celebrationStartedMs ?? frame.elapsedMs
          : racer.reactionStartedMs ?? actor.finishedAtMs ?? frame.elapsedMs;
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
        speed: racer.speed ?? 0,
        acceleration: racer.acceleration ?? 0,
        reducedMotion,
      });

      const cameraMix = frame.finish?.camera.mix ?? 0;
      const displayProgress = racer.displayProgress ?? racer.progress;
      const winnerFocus = winner ? 1 : 0;
      const actorX = winnerFocus ? this.#viewport.width * 0.5
        : screenX(this.#viewport, displayProgress, frame.finish?.camera);
      const actorY = winnerFocus ? this.#viewport.height * 0.5
        : laneY(this.#viewport, racer.lane, this.#racers.length, cameraMix);
      actor.root.position.set(actorX, actorY);
      const cameraScale = 1 + cameraMix * (this.#viewport.compact ? 0.02 : 0.08);
      actor.root.scale.set(this.#viewport.actorScale * cameraScale * (winnerFocus ? 1.42 : 1));
      actor.root.rotation = 0;
      actor.root.alpha = 1;
      actor.art.position.set(phase.x, phase.y);
      actor.art.scale.set(phase.scaleX, phase.scaleY);
      actor.art.rotation = phase.rotation;

      const visibleFrame = phase.frame;
      actor.frames.forEach((spriteFrame, index) => { spriteFrame.visible = index === visibleFrame; });
      // Procedural trails are intentionally sampled at 30fps. Actor position
      // and pose remain full-rate, but twelve Graphics clears no longer occur
      // on every display refresh.
      const effectKey = `${Math.floor(frame.elapsedMs / 34)}:${frame.heat}:${motion}:${reducedMotion}`;
      if (effectKey !== actor.effectKey) {
        actor.effectKey = effectKey;
        drawRacerEffects({
          graphics: actor.fx, pose: phase, elapsedMs: frame.elapsedMs,
          variant: actor.variant, color: actor.color, heat: frame.heat,
          speed: racer.speed ?? 0, acceleration: racer.acceleration ?? 0,
          active: frame.state === "running" || frame.state === "finished", reducedMotion,
        });
      }
      const showMobileName = this.#viewport.width <= 800 && !winnerFocus;
      actor.nameplate.visible = showMobileName;
      if (showMobileName) {
        const half = actor.nameplate.width / 2 + 5;
        actor.nameplate.position.set(
          Math.max(half, Math.min(this.#viewport.width - half, actorX)),
          Math.max(12, actorY - this.#viewport.actorScale * 38),
        );
      }
      if (winner && phase.energy > 0) winnerEnergy = {
        x: actor.root.position.x,
        y: actor.root.position.y,
        intensity: phase.energy,
      };
      shake = Math.max(shake, phase.impact);
    }
    if (winnerEnergy) drawWinnerConvergence(this.#winnerField, this.#viewport.width, this.#viewport.height,
      winnerEnergy.x, winnerEnergy.y, winnerEnergy.intensity, frame.elapsedMs, reducedMotion);
    // Running-only, sub-pixel canvas shake. It cannot reflow or resize the DOM.
    const cameraShake = (frame.finish?.camera.mix ?? 0) * 0.42;
    shake = Math.max(shake, cameraShake);
    const allowShake = frame.state === "running" && !reducedMotion && frame.heat >= 2;
    this.actors.position.set(allowShake ? Math.sin(frame.elapsedMs * 0.09) * shake * 1.15 : 0,
      allowShake ? Math.cos(frame.elapsedMs * 0.11) * shake * 0.7 : 0);
  }

  resize(): void {
    if (!this.#host) return;
    this.app.resize();
    this.#viewport = arenaViewport(this.app.screen.width, this.app.screen.height);
    this.app.canvas.dataset.actorWidth = String(Math.round(this.#viewport.actorScale * 72));
    if (this.#lastFrame) this.render(this.#lastFrame);
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#actorById.clear();
    this.#racers = [];
    this.#lastFrame = null;
    this.#fieldKey = "";
    this.#photoKey = "";
    this.app.destroy(true, { children: true });
    this.#host = null;
  }

  #petFrames(pet: ArenaPet): readonly [Graphics, Graphics, Graphics, Graphics] {
    let hash = 0;
    for (const char of pet.species) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
    const character = CHARACTERS.find((item) => item.id === pet.species) || CHARACTERS[hash % CHARACTERS.length]!;
    return [
      this.#drawPet(character.px, character.palette as Record<string, string>, pet),
      this.#drawPet(pixelPoseRows(character.px, 1), character.palette as Record<string, string>, pet),
      this.#drawPet(pixelPoseRows(character.px, 2), character.palette as Record<string, string>, pet),
      this.#drawPet(pixelPoseRows(character.px, 3), character.palette as Record<string, string>, pet),
    ];
  }

  #nameplate(racer: RaceRacer): Container {
    const root = new Container({ label: `name-${racer.id}` });
    const label = new Text({
      text: `${racer.number}  ${racer.name}`,
      style: { fill: 0xffffff, fontFamily: "system-ui, sans-serif", fontSize: 11,
        fontWeight: "800", dropShadow: { color: 0x000000, alpha: 0.9, blur: 2, distance: 1 } },
    });
    label.anchor.set(0.5);
    const width = Math.min(150, Math.max(48, label.width + 16));
    const plate = new Graphics().roundRect(-width / 2, -10, width, 20, 5)
      .fill({ color: 0x07111f, alpha: 0.9 })
      .stroke({ color: this.#color(racer.color), width: 2, alpha: 0.95 });
    root.addChild(plate, label);
    root.eventMode = "none";
    root.visible = false;
    return root;
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

  #color(value: string): number {
    const parsed = Number.parseInt(value.replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x38bdf8;
  }
}

