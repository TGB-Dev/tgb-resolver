import { defineConfig, defineSlotRecipe } from "@pandacss/dev";
import tailwindColors from "tailwindcss/colors";

// The leaderboard problem cell is the one component whose anatomy needs a
// hand-authored Panda slot recipe: it has multiple parts (root box, score
// text, verdict text) and a per-verdict color that must be precompiled (the
// React port used runtime @emotion/css composition, which Panda cannot do).
const problemCellSlotRecipe = defineSlotRecipe({
  className: "problem-cell",
  slots: ["root", "score", "verdict"],
  base: {
    root: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      borderWidth: 2,
      rounded: "sm",
      px: 1.5,
      py: 0.5,
      textAlign: "center",
    },
    score: { fontFamily: "mono" },
    verdict: { fontFamily: "mono", fontSize: "xs" },
  },
  variants: {
    verdict: {
      accepted: {
        root: { borderColor: "border.success", backgroundColor: "bg.success" },
        verdict: { color: "fg.success" },
      },
      wrongAnswer: {
        root: { borderColor: "border.error", backgroundColor: "bg.error" },
        verdict: { color: "fg.error" },
      },
      timeLimitExceeded: {
        root: { borderColor: "border.warning", backgroundColor: "bg.warning" },
        verdict: { color: "fg.warning" },
      },
      memoryLimitExceeded: {
        root: { borderColor: "border.warning", backgroundColor: "bg.warning" },
        verdict: { color: "fg.warning" },
      },
      outputLimitExceeded: {
        root: { borderColor: "border.warning", backgroundColor: "bg.warning" },
        verdict: { color: "fg.warning" },
      },
      invalidReturn: {
        root: { borderColor: "border.error", backgroundColor: "bg.error" },
        verdict: { color: "fg.error" },
      },
      runtimeError: {
        root: { borderColor: "border.error", backgroundColor: "bg.error" },
        verdict: { color: "fg.error" },
      },
      compileError: {
        root: { borderColor: "border.warning", backgroundColor: "bg.warning" },
        verdict: { color: "fg.warning" },
      },
      internalError: {
        root: { borderColor: "border.warning", backgroundColor: "bg.warning" },
        verdict: { color: "fg.warning" },
      },
      shortCircuited: {
        root: { borderColor: "border.muted", backgroundColor: "bg.muted" },
        verdict: { color: "fg.muted" },
        score: { color: "fg.muted" },
      },
      aborted: {
        root: { borderColor: "border.error", backgroundColor: "bg.error" },
        verdict: { color: "fg.error" },
      },
      pending: {
        root: {
          borderColor: "cyan.400",
          backgroundColor: "purple.700",
          animation: "pulse 2s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        },
        score: { color: "white" },
        verdict: { color: "white" },
      },
      unknown: {
        root: { borderColor: "border.subtle", backgroundColor: "bg.subtle" },
        verdict: { color: "fg.subtle" },
      },
      unresolved: {
        root: { borderColor: "cyan.border", backgroundColor: "cyan.solid" },
        score: { color: "cyan.contrast" },
        verdict: { color: "cyan.contrast" },
      },
    },
  },
  defaultVariants: { verdict: "pending" },
});

const isProd = process.env.NODE_ENV === "production";

// tailwindcss/colors (v4) already ships true OKLCH values (e.g. `oklch(62.3% 0.214 259.815)`).
// Black/white are exported as hex, so we map them to their OKLCH equivalents to stay consistent.
// `inherit`/`current`/`transparent` are kept from the Chakra preset (along with `whiteAlpha`/
// `blackAlpha`, which the dialog backdrop relies on).
const rawTailwindColors = ((tailwindColors as { default?: unknown }).default ??
  tailwindColors) as Record<string, string | Record<string, string>>;

type ColorScale = Record<string, { value: string }>;
type ColorTokens = Record<string, { value: string } | ColorScale>;

function buildTailwindColorTokens(): ColorTokens {
  const result: ColorTokens = {};
  for (const [name, value] of Object.entries(rawTailwindColors)) {
    if (typeof value === "string") {
      if (name === "black") result.black = { value: "oklch(0% 0 0)" };
      else if (name === "white") result.white = { value: "oklch(100% 0 0)" };
      // inherit / current / transparent -> kept from the preset
      continue;
    }
    const scale: ColorScale = {};
    for (const [shade, shadeValue] of Object.entries(value)) {
      scale[shade] = { value: shadeValue };
    }
    result[name] = scale;
  }
  return result;
}

const tailwindColorTokens = buildTailwindColorTokens();

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
        fonts: {
          sans: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
          serif: { value: ["Lora Variable", "ui-serif", "serif"] },
          mono: { value: ["JetBrains Mono Variable", "ui-monospace", "monospace"] },
          body: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
          heading: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
        },
        colors: tailwindColorTokens,
      },
      slotRecipes: {
        problemCell: problemCellSlotRecipe,
      },
    },
  },

  // Prod-specific config
  minify: isProd,
  hash: isProd,
});
