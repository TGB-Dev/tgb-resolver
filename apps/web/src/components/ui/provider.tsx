"use client";

import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

import { ColorModeProvider, type ColorModeProviderProps } from "./color-mode";

const config = defineConfig({
  globalCss: {
    html: {
      colorPalette: "blue",
    },
    body: {
      fontVariationSettings: '"wght" 500, "wdth" 87.5',
    },
    "code, pre, kbd, samp": {
      fontVariationSettings: "normal",
    },
  },
  theme: {
    tokens: {
      fonts: {
        heading: { value: '"Noto Sans Display Variable", sans-serif' },
        body: { value: '"Noto Sans Display Variable", sans-serif' },
        mono: { value: '"JetBrains Mono Variable", monospace' },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

export function Provider(props: ColorModeProviderProps) {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
