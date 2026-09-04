import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "../../apps/server/TGB.Resolver.Server/openapi.yaml",
  output: "src/generated",
  plugins: [
    "@hey-api/client-ofetch",
    "@tanstack/vue-query",
    "valibot",
    {
      name: "@hey-api/typescript",
      enums: "typescript",
    },
  ],
});
