import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "react/index": "src/react/index.ts",
    "server/index": "src/server/index.ts",
    "express/index": "src/express/index.ts",
    "stores/index": "src/stores/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: "es2020",
  platform: "node",
  external: [/^react($|\/)/, /^react-dom($|\/)/, /^express($|\/)/],
  outExtension({ format }) {
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
});
