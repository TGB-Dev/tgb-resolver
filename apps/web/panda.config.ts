import chakraPreset from "@chakra-ui/panda-preset";
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

// Correct the outline tab margins in the upstream preset until it is fixed there.
const presetTabs = chakraPreset.theme?.slotRecipes?.tabs;
if (!presetTabs) throw new Error("Chakra tabs recipe is missing");
const chakraTabs = structuredClone(presetTabs);
const outlineTrigger = chakraTabs.variants?.variant?.outline?.trigger;
if (!outlineTrigger) throw new Error("Chakra outline tab trigger is missing");
const horizontal = outlineTrigger._horizontal as Record<string, unknown>;
const vertical = outlineTrigger._vertical as Record<string, unknown>;
delete horizontal.marginEnd;
delete vertical.marginBottom;
horizontal._notLast = { marginEnd: "var(--line-offset)" };
vertical._notLast = { marginBottom: "var(--line-offset)" };
const fixedChakraPreset = {
  ...chakraPreset,
  theme: {
    ...chakraPreset.theme,
    slotRecipes: { ...chakraPreset.theme?.slotRecipes, tabs: chakraTabs },
  },
};

const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  // General config
  presets: ["@pandacss/preset-base", "@pandacss/preset-panda", fixedChakraPreset],
  preflight: true,
  include: ["./src/**/*.{js,jsx,ts,tsx,vue}"],
  jsxFactory: "panda",
  jsxFramework: "vue",
  outdir: "styled-system",
  hash: false,

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
});
