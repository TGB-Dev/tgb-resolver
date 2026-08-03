import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

import { resolve } from "node:path";

export default defineConfig(async () => ({
  plugins: [
    react(),
    await babel({
      plugins: ["module:@preact/signals-react-transform"],
    }),
  ],
  resolve: {
    alias: {
      "@": resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    passWithNoTests: true,
  },
}));
