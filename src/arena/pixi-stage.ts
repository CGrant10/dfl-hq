import { Application, Container, Graphics, Text } from "pixi.js";
import type { RaceFrame, RaceRacer, RaceRenderer } from "./contracts";
import { normalizePet, petMotion, type ArenaPet, type PetMotion } from "./pet-texture";
import { arenaViewport, laneY, screenX, type ArenaViewport } from "./viewport";
import { motionPose, racerVariant } from "./animation";
import { composeCharacter, type CharacterComposition } from "./character";
import { drawPhotoFinish, drawWinnerConvergence } from "./anime-effects";
import { drawRacerEffects } from "./racer-effects";

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
      /*
        GLOBAL SPEED LINES ARE OFF - see the note in screens.css. These two
        drew horizontal white bars across the entire scene every frame,
        which reads as the screen moving rather than the racers. The layers
        stay mounted and cleared so the display list and the chunk graph are
        unchanged; only the drawing is gone. Racer-specific effects
        (drawRacerEffects, per actor) are untouched.
      */
      this.#backgroundLines.clear();
      this.#foregroundLines.clear();
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
      /*
        DRAWN AT EVERY WIDTH NOW. It used to appear only below 800px, so a
        desktop Arena had no names on its racers at all and the DOM tag -
        a second implementation - covered for it. One tag, one renderer,
        pinned to the actor, identical in the Arena and the shared viewer.
      */
      const showName = !winnerFocus;
      actor.nameplate.visible = showName;
      if (showName) {
        const half = actor.nameplate.width / 2 + 4;
        actor.nameplate.position.set(
          Math.max(half, Math.min(this.#viewport.width - half, actorX)),
          Math.max(10, actorY - this.#viewport.actorScale * 34),
        );
        /* Secondary by default; briefly promoted while leading or finishing. */
        const lifted = racer.leading === true || racer.finished === true;
        actor.nameplate.alpha = lifted ? 1 : 0.82;
        actor.nameplate.scale.set(lifted ? 1.06 : 1);
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

  /*
    FOUR POSES, COMPOSED ONCE, AT SETUP.

    Character resolution, the lane-colour substitution, the run-length
    merge and the cosmetics all come from composeCharacter() now - the same
    step the profile preview and the DOM fallback draw through. This class
    no longer knows what a bandana is.

    Composition happens here, in setRacers(), not per frame: render() only
    toggles which of the four Graphics is visible.
  */
  #petFrames(pet: ArenaPet): readonly [Graphics, Graphics, Graphics, Graphics] {
    const config = { species: pet.species, color: pet.color, accent: pet.accent,
                     accessory: pet.accessory, expression: pet.expression };
    return [
      this.#drawComposition(composeCharacter(config, 0)),
      this.#drawComposition(composeCharacter(config, 1)),
      this.#drawComposition(composeCharacter(config, 2)),
      this.#drawComposition(composeCharacter(config, 3)),
    ];
  }

  /** Coloured runs -> one filled rectangle each, centred on the actor. */
  #drawComposition(composition: CharacterComposition): Graphics {
    const graphic = new Graphics();
    for (const run of composition.runs) {
      graphic
        .rect((run.x - composition.width / 2) * PIXEL_SIZE,
              (run.y - composition.height / 2) * PIXEL_SIZE,
              run.w * PIXEL_SIZE, PIXEL_SIZE)
        .fill(this.#color(run.color));
    }
    return graphic;
  }

  /*
    THE ONE NAME TAG, and it is deliberately quiet.

    This used to be an 11px bold label on an opaque plate with a 2px
    coloured stroke, up to 150px wide. On a 245px-wide phone track that is
    most of the lane: twelve of them filled the viewport and the racers -
    the thing anybody is actually watching - were behind them.

    Now: 9px, no plate stroke, a barely-there backing that exists only so
    the text survives being over grass or crowd, and a small colour pip
    instead of a coloured border. It identifies the racer and then gets out
    of the way. `emphasis` lifts one of them briefly on a lead change or a
    finish, then it drops back.
  */
  #nameplate(racer: RaceRacer): Container {
    const root = new Container({ label: `name-${racer.id}` });
    const label = new Text({
      text: racer.name,
      style: { fill: 0xffffff, fontFamily: "system-ui, sans-serif", fontSize: 9,
        fontWeight: "700", dropShadow: { color: 0x000000, alpha: 0.85, blur: 2, distance: 1 } },
    });
    label.anchor.set(0, 0.5);
    const pipR = 2.5;
    const width = label.width + pipR * 2 + 9;
    const plate = new Graphics()
      .roundRect(-width / 2 - 3, -7, width + 6, 14, 4)
      .fill({ color: 0x060b14, alpha: 0.42 });
    const pip = new Graphics()
      .circle(-width / 2 + pipR, 0, pipR)
      .fill({ color: this.#color(racer.color), alpha: 1 });
    label.position.set(-width / 2 + pipR * 2 + 5, 0);
    root.addChild(plate, pip, label);
    root.eventMode = "none";
    root.alpha = 0.82;
    root.visible = false;
    return root;
  }

  #color(value: string): number {
    const parsed = Number.parseInt(value.replace("#", ""), 16);
    return Number.isFinite(parsed) ? parsed : 0x38bdf8;
  }
}

