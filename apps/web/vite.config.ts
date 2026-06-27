import babel from "@rolldown/plugin-babel";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
  ],
});

export default config;
