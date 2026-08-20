import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import { defineConfig } from "vite";
import vueDevTools from "vite-plugin-vue-devtools";

import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  preview: {
    host: "127.0.0.1",
  },
  server: {
    host: "127.0.0.1",
  },
  envDir: resolve(import.meta.dirname, "../.."),
  plugins: [vue(), vueJsx(), vueDevTools()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@styled-system": fileURLToPath(new URL("./styled-system", import.meta.url)),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        strictExecutionOrder: true,
        codeSplitting: {
          groups: [
            {
              name: (id: string) => {
                // Fix path separators for Windows compatibility
                const normalizedId = id.replace(/\\/g, "/");

                if (normalizedId.includes("node_modules")) {
                  // PNPM and Yarn Plug'n'Play can have nested node_modules, so we take the last occurrence to get the actual package
                  const pkg = normalizedId.match(
                    /node_modules\/((?:@[^/]+\/[^/]+)|[^/]+)(?!.*node_modules)/,
                  );
                  if (pkg) {
                    // Clean up scoped package characters (@ and /) for clean filenames
                    const pkgName = pkg?.[1]?.replace("@", "").replace("/", "-");
                    return `vendor-${pkgName}`;
                  }
                }
                return null;
              },
              entriesAware: true,
              minModuleSize: 5000, // 5 kB seems good for us, Linear uses 3 kB
            },
          ],
        },
      },
    },
  },
});
