import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/signalr.ts"],
  dts: true,
  format: ["esm"],
  clean: true,
  sourcemap: true,
});
