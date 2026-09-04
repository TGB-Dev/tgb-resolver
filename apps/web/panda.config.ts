import { defineConfig } from "@pandacss/dev";

import { colorTokens } from "./panda/colors";
import { conditions } from "./panda/conditions";
import { keyframes } from "./panda/keyframes";
import {
  addBtnWrapperRecipe,
  gridTableRowRecipe,
  iconButtonRecipe,
  problemCellSlotRecipe,
} from "./panda/recipes";
import { staticCss } from "./panda/static-css";
import { animationTokens, easingTokens, fontTokens } from "./panda/tokens";

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  // General config
  presets: ["@chakra-ui/panda-preset"],
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx,vue}"],
  jsxFactory: "panda",
  jsxFramework: "vue",
  outdir: "styled-system",
  lightningcss: true,
  browserslist: ["baseline widely available", "defaults"],

  // Theme
  globalCss: {
    html: {
      // For Chakra
      colorPalette: "blue",
    },
  },

  theme: {
    extend: {
      tokens: {
        fonts: fontTokens,
        colors: colorTokens,
        easings: easingTokens,
        animations: animationTokens,
      },
      keyframes,
      slotRecipes: {
        problemCell: problemCellSlotRecipe,
      },
      recipes: {
        addBtnWrapper: addBtnWrapperRecipe,
        gridTableRow: gridTableRowRecipe,
        iconButton: iconButtonRecipe,
      },
    },
  },

  conditions,

  staticCss,

  // Prod-specific config
  minify: isProd,
  hash: isProd,
});
