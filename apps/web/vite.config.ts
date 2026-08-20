import reactScan from "@react-scan/vite-plugin-react-scan";
import babel from "@rolldown/plugin-babel";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import { resolve } from "node:path";

const config = defineConfig(async () => {
  return {
    preview: {
      host: "127.0.0.1",
    },
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      host: "127.0.0.1",
    },
    envDir: resolve(import.meta.dirname, "../.."),
    plugins: [
      tanstackRouter({ target: "react", autoCodeSplitting: true }),
      viteReact(),
      await babel({
        plugins: ["module:@preact/signals-react-transform"],
      }),
      reactScan(),
    ],
    build: {
      cssMinify: "lightningcss",
      rolldownOptions: {
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            groups: [
              {
                name: "vendor-chakra",
                test: /node_modules\/@chakra-ui/,
                priority: 100,
              },
              {
                name: "vendor-react-core",
                test: /node_modules\/(react|react-dom|react-compiler-runtime)/,
                priority: 90,
              },
              {
                name: "vendor-tanstack",
                test: /node_modules\/@tanstack\/(react-router|react-start|router-core)/,
                priority: 80,
              },
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
  };
});

export default config;
