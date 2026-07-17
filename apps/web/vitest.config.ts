import preact from "@preact/preset-vite";
import { defineConfig } from "vitest/config";

import { resolve } from "node:path";

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
    passWithNoTests: true,
  },
});
