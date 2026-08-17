import { describe, expect, it } from "vitest";
import {
  ACCESSORY_KEYS,
  EXPRESSION_KEYS,
  GRID_H,
  GRID_W,
  characterIds,
  characterSvg,
  composeCharacter,
  normalizeCharacter,
  runsToPaths,
  silhouetteRuns,
} from "./character";

/*
  The cells the two old implementations drew, transcribed from the ORIGINALS
  before either was deleted:

    js/arena/dfl-sprites.js   cosmeticPaths(), as SVG path data
    src/arena/pixi-stage.ts   #drawCosmetics(), as loops of rows

  Both were traced cell by cell and agreed. These fixtures are that agreed
  answer, so if a future change to the compositor moves a hat by one pixel
  the test says so.
*/
const LEGACY_ACCESSORY_CELLS: Record<string, [number, number][]> = {
  bandana: [],
  visor: [],
  crown: [],
  headphones: [],
  cape: [],
};
const push = (key: string, x1: number, x2: number, y1: number, y2: number) => {
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) LEGACY_ACCESSORY_CELLS[key]!.push([x, y]);
};
push("bandana", 6, 17, 8, 9); push("bandana", 17, 19, 10, 11);
push("visor", 7, 17, 4, 5); push("visor", 17, 19, 6, 6);
push("crown", 8, 9, 1, 2); push("crown", 12, 13, 1, 2); push("crown", 16, 17, 1, 2);
push("crown", 8, 17, 3, 5);
push("headphones", 8, 17, 2, 3); push("headphones", 6, 7, 4, 8); push("headphones", 18, 19, 4, 8);
push("cape", 4, 6, 7, 10); push("cape", 2, 6, 11, 12);

const LEGACY_EXPRESSION_CELLS: Record<string, [number, number][]> = {
  happy: [[10, 6], [15, 6], [12, 9], [13, 9], [14, 9]],
  fierce: [[9, 6], [10, 6], [11, 6], [14, 6], [15, 6], [16, 6], [12, 9], [13, 9], [14, 9]],
  sleepy: [[9, 7], [10, 7], [11, 7], [14, 7], [15, 7], [16, 7]],
  focused: [],
};

const ACCENT = "#ffd84a";
const LANE = "#4aa3ff";
const cellsOf = (runs: readonly { x: number; y: number; w: number; color: string }[], color: string) => {
  const out: string[] = [];
  for (const r of runs) {
    if (r.color !== color) continue;
    for (let i = 0; i < r.w; i++) out.push(`${r.x + i},${r.y}`);
  }
  return out.sort();
};
const key = (cells: [number, number][]) => cells.map(([x, y]) => `${x},${y}`).sort();

describe("character compositor - parity with what the renderers drew before", () => {
  for (const accessory of Object.keys(LEGACY_ACCESSORY_CELLS)) {
    it(`places ${accessory} on exactly the legacy cells`, () => {
      const runs = composeCharacter({ species: "emberrat", color: LANE, accent: ACCENT, accessory }).runs;
      expect(cellsOf(runs, ACCENT)).toEqual(key(LEGACY_ACCESSORY_CELLS[accessory]!));
    });
  }

  for (const expression of Object.keys(LEGACY_EXPRESSION_CELLS)) {
    it(`draws the ${expression} face on exactly the legacy cells`, () => {
      const runs = composeCharacter({ species: "emberrat", color: LANE, accent: ACCENT, expression }).runs;
      expect(cellsOf(runs, "#17191f")).toEqual(key(LEGACY_EXPRESSION_CELLS[expression]!));
    });
  }

  it("substitutes the lane colour for L and nothing else", () => {
    const rows = ["..LL..", "AALLAA"] as const;
    const runs = silhouetteRuns(rows, { A: "#111111" }, LANE);
    expect(runs).toEqual([
      { x: 2, y: 0, w: 2, color: LANE },
      { x: 0, y: 1, w: 2, color: "#111111" },
      { x: 2, y: 1, w: 2, color: LANE },
      { x: 4, y: 1, w: 2, color: "#111111" },
    ]);
  });

  it("merges runs rather than emitting a node per pixel", () => {
    const runs = composeCharacter({ species: "emberrat", color: LANE }).runs;
    const pixels = runs.reduce((n, r) => n + r.w, 0);
    expect(pixels).toBeGreaterThan(runs.length * 2);   // real merging happened
    expect(runs.length).toBeLessThan(GRID_W * GRID_H);
  });
});

describe("character compositor - legacy pet configs", () => {
  it("accepts the pet shape that is already in the database", () => {
    const stored = { species: "sparkpup", color: "#C8102E", accent: "#65e5ff",
                     accessory: "crown", expression: "fierce", trail: "spark", name: "Ripper" };
    const cfg = normalizeCharacter(stored);
    expect(cfg.species).toBe("sparkpup");
    expect(cfg.color).toBe("#C8102E");
    expect(cfg.accessory).toBe("crown");
    expect(cfg.kind).toBe("dfl");          // absent kind means the DFL roster
    expect(composeCharacter(cfg).runs.length).toBeGreaterThan(0);
  });

  it("survives null, undefined, a string and junk", () => {
    for (const input of [null, undefined, "", 42, [], { species: null }]) {
      const cfg = normalizeCharacter(input);
      expect(cfg.color).toBeTruthy();
      expect(composeCharacter(cfg).runs.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the lane colour when the pet has none", () => {
    expect(normalizeCharacter({}, "#abcdef").color).toBe("#abcdef");
  });

  it("gives an unknown species a stable body rather than nothing", () => {
    const a = composeCharacter({ species: "trex", color: LANE });
    const b = composeCharacter({ species: "trex", color: LANE });
    expect(a.runs.length).toBeGreaterThan(0);
    expect(a.runs).toEqual(b.runs);
  });

  it("ignores an accessory or expression it does not know", () => {
    const plain = composeCharacter({ species: "emberrat", color: LANE }).runs;
    const odd = composeCharacter({ species: "emberrat", color: LANE,
                                   accessory: "sombrero", expression: "smug" }).runs;
    expect(odd).toEqual(plain);
  });
});

describe("character compositor - poses and SVG", () => {
  it("composes four distinct poses from the same character", () => {
    const seen = new Set<string>();
    for (const pose of [0, 1, 2, 3] as const) {
      seen.add(JSON.stringify(composeCharacter({ species: "emberrat", color: LANE }, pose).runs));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("is deterministic - the same config composes identically every time", () => {
    const cfg = { species: "tinplate", color: LANE, accent: ACCENT, accessory: "visor", expression: "happy" };
    expect(composeCharacter(cfg, 1).runs).toEqual(composeCharacter(cfg, 1).runs);
    expect(characterSvg(cfg)).toBe(characterSvg(cfg));
  });

  it("emits one path per colour, not one per pixel", () => {
    const runs = composeCharacter({ species: "emberrat", color: LANE, accent: ACCENT, accessory: "crown" }).runs;
    const paths = runsToPaths(runs);
    const colours = new Set(runs.map((r) => r.color));
    expect((paths.match(/<path /g) || []).length).toBe(colours.size);
  });

  it("emits the SVG shape the app already styles", () => {
    const svg = characterSvg({ species: "emberrat", color: LANE });
    expect(svg).toContain('class="racer-art racer-px has-frames"');
    expect(svg).toContain('shape-rendering="crispEdges"');
    expect(svg).toContain(`viewBox="0 0 ${GRID_W} ${GRID_H}"`);
    expect(svg).toContain('class="px-frame px-frame-a"');
    expect(svg).toContain('class="px-frame px-frame-b"');
  });

  it("keeps a colour from breaking out of the fill attribute", () => {
    const svg = characterSvg({ species: "emberrat", color: '"><script>x' });
    expect(svg).not.toContain("<script");
    expect(svg).not.toContain('""');
  });

  it("draws every roster character and every catalogued cosmetic", () => {
    expect(characterIds().length).toBeGreaterThan(0);
    for (const species of characterIds()) {
      expect(composeCharacter({ species, color: LANE }).runs.length).toBeGreaterThan(0);
    }
    for (const accessory of ACCESSORY_KEYS) {
      expect(composeCharacter({ species: "emberrat", color: LANE, accessory }).runs.length).toBeGreaterThan(0);
    }
    for (const expression of EXPRESSION_KEYS) {
      expect(composeCharacter({ species: "emberrat", color: LANE, expression }).runs.length).toBeGreaterThan(0);
    }
  });
});
