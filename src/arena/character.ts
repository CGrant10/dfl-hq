/* =====================================================================
   arena/character.ts - one interpretation of a racer's appearance.
   ---------------------------------------------------------------------
   THE PROBLEM THIS SOLVES.

   A DFL character is a 24x15 grid of letters plus a palette, and until now
   TWO renderers read that grid independently:

     js/arena/dfl-sprites.js   run-length merged into SVG <path> elements,
                               used by the profile preview and the DOM
                               fallback, with the hats and faces written as
                               hand-authored SVG path data
     src/arena/pixi-stage.ts   the same grid drawn as Graphics rectangles,
                               used by the live race, with the hats and
                               faces written a second time as loops of rows

   They agree today - every accessory and expression was traced cell by cell
   and both produce identical output. That is worth stating precisely,
   because it means this refactor changes nothing on screen. What it removes
   is the standing invitation to drift: two notations for one drawing, with
   nothing checking them against each other, right before a pass that is
   about to add skin, hair, shirts, trousers, shoes and hats to both.

   WHAT THIS IS. A renderer-neutral composition step:

     config -> composeCharacter() -> a flat list of coloured runs

   A run is one horizontal span of identical colour: {x, y, w, colour}. SVG
   turns runs into path data; Pixi turns them into filled rectangles; a
   future canvas or WebGL path would turn them into whatever it likes. The
   ORDER of the runs is the layer order, back to front, which is what makes
   this the right shape to hang PHASE 2's body/trousers/shirt/shoes/hair/hat
   stack on without either renderer learning anything new.

   WHAT IT IS NOT, YET. There is no human layer catalogue and no animal
   catalogue here - that is Phase 2 and Phase 3. This commit is the
   foundation and the tests that pin it.
   ===================================================================== */

import { CHARACTERS, GRID_H, GRID_W, characterFor } from "../../js/arena/dfl-sprites.js";
import { pixelPoseRows, type PixelPose } from "./pixel-poses";

export { GRID_H, GRID_W };

/** One horizontal span of a single colour. The atom every renderer draws. */
export interface PixelRun {
  x: number;
  y: number;
  w: number;
  color: string;
}

export interface CharacterComposition {
  width: number;
  height: number;
  pose: PixelPose;
  /** Back to front. Base silhouette first, cosmetics last. */
  runs: PixelRun[];
}

/**
 * A racer's appearance.
 *
 * This is the EXISTING pet shape, unchanged - `species`, `color`, `accent`,
 * `accessory`, `expression`, `trail` - because that is what is already
 * stored as jsonb on the member row and written through the
 * dfl_update_profile RPC. `kind` is reserved for Phase 2/3 and is optional;
 * anything stored today has no `kind` and resolves to the DFL roster, which
 * is why every existing pet keeps working untouched.
 */
export interface CharacterConfig {
  kind?: "dfl" | "human" | "animal";
  species?: string | null;
  color?: string | null;
  accent?: string | null;
  accessory?: string | null;
  expression?: string | null;
  trail?: string | null;
}

export const DEFAULT_COLOR = "#2fbf5f";
export const DEFAULT_ACCENT = "#ffffff";
/** The ink every face is drawn in. */
export const FACE_INK = "#17191f";

/**
 * Accept anything the database might hand back and produce a usable config.
 *
 * The pet column has been jsonb and it has been text; petOf() in
 * profile-dfl.js already copes with both, and this copes with neither being
 * present at all. A missing species is not an error - the roster hashes
 * unknown ids to a stable character, so a racer always has a body.
 */
export function normalizeCharacter(pet: unknown, laneColor?: string | null): CharacterConfig {
  const raw: Record<string, unknown> =
    pet && typeof pet === "object" ? (pet as Record<string, unknown>) : {};
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
  return {
    kind: (str(raw["kind"]) as CharacterConfig["kind"]) || "dfl",
    species: str(raw["species"]),
    color: str(raw["color"]) || laneColor || DEFAULT_COLOR,
    accent: str(raw["accent"]) || DEFAULT_ACCENT,
    accessory: str(raw["accessory"]),
    expression: str(raw["expression"]),
    trail: str(raw["trail"]),
  };
}

/* --------------------------------------------------------------------
   Cosmetics, expressed once.

   These are the exact cells both renderers were drawing. Rows rather than
   path data, because rows are trivially checkable against the Pixi
   original and trivially convertible into path data for the SVG one.
   -------------------------------------------------------------------- */

interface Span { x1: number; x2: number; y: number }

const band = (x1: number, x2: number, y1: number, y2: number): Span[] => {
  const out: Span[] = [];
  for (let y = y1; y <= y2; y++) out.push({ x1, x2, y });
  return out;
};

const ACCESSORY_SPANS: Record<string, Span[]> = {
  bandana: [...band(6, 17, 8, 9), ...band(17, 19, 10, 11)],
  visor: [...band(7, 17, 4, 5), ...band(17, 19, 6, 6)],
  crown: [
    ...band(8, 9, 1, 2), ...band(12, 13, 1, 2), ...band(16, 17, 1, 2),
    ...band(8, 17, 3, 5),
  ],
  headphones: [
    ...band(8, 17, 2, 3),
    ...band(6, 7, 4, 8), ...band(18, 19, 4, 8),
  ],
  cape: [...band(4, 6, 7, 10), ...band(2, 6, 11, 12)],
};

const EXPRESSION_SPANS: Record<string, Span[]> = {
  happy: [{ x1: 10, x2: 10, y: 6 }, { x1: 15, x2: 15, y: 6 }, { x1: 12, x2: 14, y: 9 }],
  fierce: [{ x1: 9, x2: 11, y: 6 }, { x1: 14, x2: 16, y: 6 }, { x1: 12, x2: 14, y: 9 }],
  sleepy: [{ x1: 9, x2: 11, y: 7 }, { x1: 14, x2: 16, y: 7 }],
  focused: [],
};

export const ACCESSORY_KEYS = ["none", ...Object.keys(ACCESSORY_SPANS)];
export const EXPRESSION_KEYS = Object.keys(EXPRESSION_SPANS);

const spansToRuns = (spans: Span[], color: string): PixelRun[] =>
  spans.map((s) => ({ x: s.x1, y: s.y, w: s.x2 - s.x1 + 1, color }));

/**
 * The base silhouette, run-length merged.
 *
 * `L` is the lane colour rather than a palette entry - that one substitution
 * is what keeps twelve racers colour-coded to their lanes while still being
 * twelve different creatures.
 */
export function silhouetteRuns(
  rows: readonly string[],
  palette: Record<string, string>,
  laneColor: string,
): PixelRun[] {
  const runs: PixelRun[] = [];
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? "";
    let x = 0;
    while (x < row.length) {
      const ch = row[x]!;
      if (ch === "." || ch === " ") { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      runs.push({ x, y, w, color: ch === "L" ? laneColor : (palette[ch] || laneColor) });
      x += w;
    }
  }
  return runs;
}

/** One racer, one pose, as an ordered list of coloured runs. */
export function composeCharacter(config: CharacterConfig, pose: PixelPose = 0): CharacterComposition {
  const cfg = config.species || config.color ? config : normalizeCharacter(config);
  const character = characterFor(cfg.species) as {
    px: readonly string[];
    palette: Record<string, string>;
  };
  const laneColor = cfg.color || DEFAULT_COLOR;
  const accent = cfg.accent || DEFAULT_ACCENT;

  const runs = silhouetteRuns(pixelPoseRows(character.px, pose), character.palette, laneColor);
  const accessory = cfg.accessory ? ACCESSORY_SPANS[cfg.accessory] : undefined;
  if (accessory) runs.push(...spansToRuns(accessory, accent));
  const expression = cfg.expression ? EXPRESSION_SPANS[cfg.expression] : undefined;
  if (expression) runs.push(...spansToRuns(expression, FACE_INK));

  return { width: GRID_W, height: GRID_H, pose, runs };
}

/* --------------------------------------------------------------------
   SVG, from the same runs.
   -------------------------------------------------------------------- */

const safeAttr = (value: string): string => value.replace(/["<>&]/g, "");

/** Runs grouped into one <path> per colour, which is what keeps a racer
    five or six DOM nodes instead of three hundred and sixty. */
export function runsToPaths(runs: readonly PixelRun[]): string {
  const byColor = new Map<string, string[]>();
  for (const r of runs) {
    const list = byColor.get(r.color) || [];
    list.push(`M${r.x} ${r.y}h${r.w}v1h-${r.w}z`);
    byColor.set(r.color, list);
  }
  let out = "";
  for (const [color, ds] of byColor) out += `<path fill="${safeAttr(color)}" d="${ds.join("")}"/>`;
  return out;
}

/**
 * One character as inline SVG.
 *
 * Two pose groups, swapped by a CSS steps() animation, exactly as before -
 * but the poses now come from pixelPoseRows(), the same function the live
 * race uses, instead of a second stride implementation. shape-rendering
 * crispEdges is the whole point: without it the browser antialiases the
 * pixel edges and the sprite turns to mush at the size it is drawn.
 */
export function characterSvg(config: CharacterConfig, laneColor?: string | null): string {
  const cfg = normalizeCharacter(config, laneColor);
  const a = composeCharacter(cfg, 0);
  const b = composeCharacter(cfg, 2);
  return `<svg class="racer-art racer-px has-frames" xmlns="http://www.w3.org/2000/svg" ` +
         `viewBox="0 0 ${GRID_W} ${GRID_H}" shape-rendering="crispEdges" aria-hidden="true">` +
         `<g class="px-frame px-frame-a">${runsToPaths(a.runs)}</g>` +
         `<g class="px-frame px-frame-b">${runsToPaths(b.runs)}</g>` +
         `</svg>`;
}

/** Every roster id, for pickers. */
export function characterIds(): string[] {
  return (CHARACTERS as { id: string }[]).map((c) => c.id);
}
