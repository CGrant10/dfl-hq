import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: { entry: "src/arena/runtime.ts", formats: ["es"], fileName: () => "pixi-runtime.js" },
    outDir: "js/arena",
    emptyOutDir: false,
    sourcemap: true,
    minify: "oxc",
  },
});
