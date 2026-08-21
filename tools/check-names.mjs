// Fail the build on identifiers that do not exist.
//
// See the header in tsconfig.names.json for the bug that prompted this. A full
// checkJs run over js/ is far too noisy to gate on, so this keeps only the
// codes that describe a name which cannot resolve at runtime:
//
//   TS2304 / TS2552  Cannot find name 'x'
//   TS2451           Cannot redeclare block-scoped variable 'x'
//   TS2554 / TS2555  Wrong number of arguments to a known signature
//
// Everything else tsc says about these files is ignored on purpose.
import { spawnSync } from "node:child_process";

const FATAL = new Set(["TS2304", "TS2552", "TS2451", "TS2554", "TS2555"]);

/* Browser globals this lib set does not describe. */
const ALLOWED_NAMES = ["GPUTextureUsage", "GPUBufferUsage", "MSStream"];

/* tsconfig `exclude` only trims the ROOT file list - anything an included
   module imports still gets checked. The vendored Pixi bundles arrive that
   way, so they have to be dropped here instead. */
const VENDOR = /^(pixi-runtime[.]js|[A-Za-z0-9]+-[A-Za-z0-9_-]{8}[.]js)$/;

const tsc = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.names.json"],
  { encoding: "utf8" },
);

const LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const hits = [];
for (const line of `${tsc.stdout || ""}\n${tsc.stderr || ""}`.split(/\r?\n/)) {
  const m = LINE.exec(line.trim());
  if (!m) continue;
  const [, file, row, col, code, message] = m;
  if (!FATAL.has(code)) continue;
  if (VENDOR.test(file.split(/[/\\]/).pop())) continue;
  if (ALLOWED_NAMES.some((name) => message.includes(`'${name}'`))) continue;
  hits.push({ file, row, col, code, message });
}

if (!hits.length) {
  console.log("check-names: no unresolved identifiers in js/");
  process.exit(0);
}

console.error(`check-names: ${hits.length} unresolved identifier(s)\n`);
for (const h of hits) console.error(`  ${h.file}:${h.row}:${h.col}  ${h.code}  ${h.message}`);
console.error("\nEach of these is a ReferenceError or a bad call the moment that line runs.");
process.exit(1);
