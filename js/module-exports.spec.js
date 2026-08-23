// =====================================================================
// Every named import must resolve to a real export.
// ---------------------------------------------------------------------
// WHY THIS TEST EXISTS. Removing the DFL Pet deleted petOf() from
// profile-dfl.js, and pages/broadcast.js was still importing it. A missing
// named export is not a quiet `undefined` - it is a module-level
// SyntaxError that fails the ENTIRE page, so the shared Arena race view
// went white for anybody who opened it through Broadcast. Nothing caught
// it: the removal typechecked, every unit test passed, and the page that
// broke was one nobody re-opened.
//
// This walks the real import graph instead. It is deliberately a text
// scan rather than a set of dynamic imports: half these modules touch
// window, localStorage or a CDN at module scope and cannot be loaded in a
// test runner at all - which is the same reason the bug got through.
// =====================================================================

import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = "js";
/* Vendored + generated bundles are not ours to lint: the hash-suffixed Pixi
   chunks and the pixi-runtime.js built from src/. Everything else under
   js/arena IS hand-written (race.js, the shims, duck-physics) and used to be
   skipped along with them, which left the Arena import graph uncovered. */
const VENDOR_FILE = /^(pixi-runtime\.js|[A-Za-z0-9]+-[A-Za-z0-9_-]{8}\.js)$/;

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules") sourceFiles(full, out);
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".spec.js") && !VENDOR_FILE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Every name a module makes available to `import { ... }`. */
function namedExports(file) {
  const src = fs.readFileSync(file, "utf8");
  const names = new Set();
  for (const m of src.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  for (const m of src.matchAll(/^export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/gm)) names.add(m[1]);
  /* `export { a, b as c }` - the exported name is whatever follows `as`. */
  for (const m of src.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop().trim();
      if (name) names.add(name);
    }
  }
  /* A re-export of everything: assume it satisfies any name rather than
     resolving the chain, which would need a real module resolver. */
  if (/^export\s+\*/m.test(src)) names.add("*");
  return names;
}

/** Every `import { ... } from "./relative"` in a module. */
function namedImports(file) {
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g)) {
    const spec = m[2];
    if (!spec.startsWith(".")) continue;          // bare + CDN specifiers
    const names = m[1].split(",")
      .map((p) => p.trim().split(/\s+as\s+/)[0].trim())
      .filter(Boolean);
    /* The arena shims import "./race.js?legacy=1" to reach past the service
       worker rewrite. The query is not part of the path on disk. */
    const onDisk = spec.split("?")[0];
    out.push({ spec, names, target: path.normalize(path.join(path.dirname(file), onDisk)) });
  }
  return out;
}

const FILES = sourceFiles(ROOT);
const exportCache = new Map();
const exportsFor = (f) => {
  if (!exportCache.has(f)) exportCache.set(f, namedExports(f));
  return exportCache.get(f);
};

describe("the import graph", () => {
  it("finds the app's modules", () => {
    expect(FILES.length).toBeGreaterThan(40);
  });

  it("points every relative import at a file that exists", () => {
    const broken = [];
    for (const file of FILES) {
      for (const imp of namedImports(file)) {
        if (!fs.existsSync(imp.target)) broken.push(`${file} -> ${imp.spec}`);
      }
    }
    expect(broken).toEqual([]);
  });

  /*
    THE ONE THAT WOULD HAVE CAUGHT THE PET BUG. If this fails, the named
    import is gone from the module it comes from, and the page doing the
    importing is dead on arrival - not degraded, dead.
  */
  it("resolves every named import to a real export", () => {
    const missing = [];
    for (const file of FILES) {
      for (const imp of namedImports(file)) {
        if (!fs.existsSync(imp.target)) continue;   // reported above
        const available = exportsFor(imp.target);
        if (available.has("*")) continue;
        for (const name of imp.names) {
          if (!available.has(name)) {
            missing.push(`${file} imports { ${name} } from "${imp.spec}"`);
          }
        }
      }
    }
    expect(missing).toEqual([]);
  });

  /* A stale import of a module that no longer exists at all is the other
     half of the same failure, and cheap to rule out. */
  it("has no import of a deleted module", () => {
    for (const file of FILES) {
      for (const imp of namedImports(file)) {
        expect(fs.existsSync(imp.target), `${file} -> ${imp.spec}`).toBe(true);
      }
    }
  });
});

describe("the initial app shell", () => {
  it("does not eagerly boot golf feature modules on every route", () => {
    const html = fs.readFileSync("index.html", "utf8");
    const config = fs.readFileSync("js/config.js", "utf8");
    expect(html).not.toMatch(/<script[^>]+src=["']js\/golf-/);
    expect(config).toContain("export function loadGolfFeatures()");
  });

  it("does not keep the Broadcast blur poll alive outside Broadcast", () => {
    const source = fs.readFileSync("js/arena/mobile-broadcast-performance.js", "utf8");
    expect(source).toMatch(/if \(isPhoneBroadcast\(\)\) blurTimer = window\.setInterval/);
  });

  it("keeps Pixi out of ordinary metadata consumers", () => {
    const sections = fs.readFileSync("js/sections.js", "utf8");
    const results = fs.readFileSync("js/pages/arena-results.js", "utf8");
    expect(sections).toContain("arena/sprite-themes.js");
    expect(results).toContain("arena/sprite-themes.js");
    expect(sections).not.toMatch(/from ["'][^"']*arena\/sprites\.js["']/);
    expect(results).not.toMatch(/from ["'][^"']*arena\/sprites\.js["']/);
  });
});

describe("the supported golf GPS courses", () => {
  const configs = [
    "js/golf-gps-beta.js",
    "js/golf-gps-red-trail-beta.js",
    "js/golf-gps-rolla-beta.js",
  ];

  it.each(configs)("keeps nine explicit green targets in %s", (file) => {
    const source = fs.readFileSync(file, "utf8");
    const greenConfig = source.split("holeTargets:")[1];
    const targets = [...greenConfig.matchAll(/^\s*(\d+):\{lat:([-\d.]+),lng:([-\d.]+)\}/gm)];
    expect(targets.map((match) => Number(match[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(targets.map((match) => `${match[2]},${match[3]}`)).size).toBe(9);
    expect(source).toMatch(/yards to Hole \$\{hole\} green|label:/);
  });

  it("keeps nine explicit Rolla tee targets for hole-only framing", () => {
    const source = fs.readFileSync("js/golf-gps-rolla-beta.js", "utf8");
    const teeConfig = source.split("teeTargets:")[1].split("holeTargets:")[0];
    const targets = [...teeConfig.matchAll(/^\s*(\d+):\{lat:([-\d.]+),lng:([-\d.]+)\}/gm)];
    expect(targets.map((match) => Number(match[1]))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("keeps the DFL app navigation visible during a Quick Round", () => {
    const source = fs.readFileSync("js/golf-event-modes.js", "utf8");
    expect(source).toContain("body.gqm-focus .golf-event-head,body.gqm-focus .guest-strip");
    expect(source).not.toMatch(/body\.gqm-focus \.topbar[^`]+display:none/);
    expect(source).not.toMatch(/body\.gqm-focus \.tabbar[^`]+display:none/);
    expect(source).not.toMatch(/body\.gqm-focus \.bottomline[^`]+display:none/);
  });

  it("lets Golf inherit the active app theme without repainting the shell", () => {
    const source = fs.readFileSync("js/golf-theme.js", "utf8");
    const golfCss = fs.readFileSync("css/golf.css", "utf8");
    const navCss = fs.readFileSync("css/nav-neutral.css", "utf8");
    expect(source).not.toContain("pinMode(");
    expect(source).toContain("classList.toggle(GOLF_CONTENT_CLASS, onGolf())");
    expect(golfCss).toContain("body.golf-content #view");
    expect(golfCss).not.toMatch(/body\.golf-content\s+\.(?:topbar|tabbar|whoami)/);
    expect(navCss).toContain("color:var(--muted) !important");
    expect(navCss).not.toContain("color:#f5f7fa !important");
  });

  it("offers a synchronized Fairway Light app palette", () => {
    const theme = fs.readFileSync("js/theme.js", "utf8");
    const memberScope = fs.readFileSync("js/member-theme-scope.js", "utf8");
    const schema = fs.readFileSync("theme_sync_schema.sql", "utf8");
    expect(theme).toContain('fairway: {');
    expect(theme).toContain('{ id: "fairway", name: "Fairway Light" }');
    expect(theme).toContain('name === "light" || name === "fairway"');
    expect(theme).toContain('setAttribute("data-palette", name)');
    expect(memberScope).toContain('"fairway"');
    expect(schema).toContain("'system', 'dark', 'light', 'fairway', 'medicine'");
  });

  it("shows only the current hole maximum in the Quick Round GPS badge", () => {
    const source = fs.readFileSync("js/golf-gps-course-map.js", "utf8");
    expect(source).toContain('${fallback?formatYards(fallback):"—"}</strong><small>YDS</small>');
    expect(source).not.toContain('value!=null?"YDS LIVE"');
  });
});
