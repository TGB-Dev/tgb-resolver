import babel from "@rolldown/plugin-babel";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const config = defineConfig({
  preview: {
    host: "127.0.0.1",
  },
  resolve: { tsconfigPaths: true },
  server: {
    host: "127.0.0.1",
  },
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
