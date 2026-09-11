import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "dist");
const directories = ["assets", "css", "fonts", "icons", "js"];
const files = ["index.html", "manifest.json", "sw.js", "version.txt", ".nojekyll"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await Promise.all(directories.map(name => cp(resolve(root, name), resolve(output, name), { recursive: true })));
await Promise.all(files.map(name => cp(resolve(root, name), resolve(output, name))));
await mkdir(resolve(output, ".openai"), { recursive: true });
const hosting = JSON.parse(await readFile(resolve(root, ".openai", "hosting.json"), "utf8"));
delete hosting.static;
await writeFile(resolve(output, ".openai", "hosting.json"), `${JSON.stringify(hosting, null, 2)}\n`);
