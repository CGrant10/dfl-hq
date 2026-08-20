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
/* The built Pixi runtime is generated from src/ and is not ours to lint. */
const SKIP_DIR = /[\\/]arena$/;

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIR.test(full) && entry.name !== "node_modules") sourceFiles(full, out);
    } else if (entry.name.endsWith(".js") && !entry.name.endsWith(".spec.js")) {
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
    out.push({ spec, names, target: path.normalize(path.join(path.dirname(file), spec)) });
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
