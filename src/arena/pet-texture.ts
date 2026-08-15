import type { RacePet } from "./contracts";

export type PetMotion = "idle" | "run" | "surge" | "stumble" | "jump" | "duel" | "near" | "win" | "lose";

export interface ArenaPet extends RacePet {
  name: string;
  accessory: "none" | "bandana" | "visor" | "crown" | "headphones" | "cape";
  expression: "focused" | "happy" | "fierce" | "sleepy";
}

const SAFE_COLOR = /^#[0-9a-f]{6}$/i;
const accessories = new Set<ArenaPet["accessory"]>(["none", "bandana", "visor", "crown", "headphones", "cape"]);
const expressions = new Set<ArenaPet["expression"]>(["focused", "happy", "fierce", "sleepy"]);

export function normalizePet(pet: RacePet | null, fallbackColor = "#38bdf8"): ArenaPet {
  const raw = (pet || {}) as Partial<ArenaPet>;
  return {
    name: String(raw.name || "").slice(0, 24),
    species: String(raw.species || "emberrat").replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "emberrat",
    color: SAFE_COLOR.test(raw.color || "") ? raw.color! : fallbackColor,
    accent: SAFE_COLOR.test(raw.accent || "") ? raw.accent! : "#ffffff",
    trail: ["none", "dust", "spark", "rainbow"].includes(raw.trail || "") ? raw.trail! : "none",
    accessory: accessories.has(raw.accessory as ArenaPet["accessory"]) ? raw.accessory! : "none",
    expression: expressions.has(raw.expression as ArenaPet["expression"]) ? raw.expression! : "focused",
  };
}

function hash(value: string): number {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Self-contained pixel SVG; safe to cache as a Pixi texture without network requests. */
export function petSvg(input: RacePet | null, fallbackColor?: string): string {
  const pet = normalizePet(input, fallbackColor);
  const shape = hash(pet.species) % 4;
  const ears = shape === 0 ? '<path d="M10 13V5h8v8M46 13V5h8v8"/>'
    : shape === 1 ? '<path d="M8 14 14 4l8 10M42 14l8-10 6 10"/>'
    : shape === 2 ? '<path d="M12 13 8 7h12M44 13l12-6-4 10"/>' : "";
  const eyes = pet.expression === "sleepy" ? '<path d="M20 25h7M37 25h7"/>'
    : pet.expression === "happy" ? '<path d="m20 24 4 3 4-3m8 0 4 3 4-3"/>'
    : '<rect x="21" y="23" width="6" height="6"/><rect x="37" y="23" width="6" height="6"/>';
  const mouth = pet.expression === "fierce" ? '<path d="m26 36 6-3 6 3"/>' : '<path d="M27 34h10"/>';
  const accessory = pet.accessory === "crown" ? '<path fill="'+pet.accent+'" d="M20 13V4l6 6 6-8 6 8 6-6v9z"/>'
    : pet.accessory === "visor" ? '<rect fill="'+pet.accent+'" x="17" y="20" width="30" height="8"/>'
    : pet.accessory === "bandana" ? '<path fill="'+pet.accent+'" d="M12 37h40v6H38l-6 8-6-8H12z"/>'
    : pet.accessory === "cape" ? '<path fill="'+pet.accent+'" d="M10 34 2 58h28l2-20z"/>'
    : pet.accessory === "headphones" ? '<path fill="none" stroke="'+pet.accent+'" stroke-width="5" d="M14 28a18 18 0 0 1 36 0v10M11 28h7v12h-7m35-12h7v12h-7"/>' : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" shape-rendering="crispEdges"><g fill="${pet.color}">${ears}<rect x="12" y="12" width="40" height="34" rx="4"/><rect x="18" y="43" width="10" height="14"/><rect x="38" y="43" width="10" height="14"/></g><g fill="${pet.accent}" stroke="${pet.accent}" stroke-width="3">${eyes}${mouth}</g>${accessory}</svg>`;
}

export function petTextureUri(pet: RacePet | null, fallbackColor?: string): string {
  return `data:image/svg+xml,${encodeURIComponent(petSvg(pet, fallbackColor))}`;
}

export function petMotion(reaction: string | undefined, finished: boolean, state: string): PetMotion {
  if (finished) return "win";
  if (reaction && ["surge", "stumble", "jump", "duel", "near"].includes(reaction)) return reaction as PetMotion;
  return state === "running" ? "run" : "idle";
}
