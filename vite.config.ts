import { defineConfig } from "vite";

export default defineConfig({
  plugins: [{
    name: "dfl-source-development",
    apply: "serve",
    transformIndexHtml(html) {
      return html.replace(/js\/bundle\/\d+\.\d+\.\d+\//g, "js/")
        .replace(/\sdata-dfl-bundle="[^"]+"/, "");
    },
  }],
  build: {
    lib: { entry: "src/arena/runtime.ts", formats: ["es"], fileName: () => "pixi-runtime.js" },
    outDir: "js/arena",
    emptyOutDir: false,
    sourcemap: true,
    minify: "oxc",
  },
});
