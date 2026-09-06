import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../apps/server/openapi.yaml",
  output: "src/generated",
  plugins: ["@hey-api/client-ofetch", "@tanstack/vue-query", "valibot", "@hey-api/typescript"],
});
