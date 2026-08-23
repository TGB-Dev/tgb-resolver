import { defineConfig, defineRecipe, defineSlotRecipe } from "@pandacss/dev";
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
      },
      aborted: {
        root: { borderColor: "border.error", backgroundColor: "bg.error" },
        verdict: { color: "fg.error" },
      },
      pending: {
        root: {
          borderColor: "cyan.400",
          backgroundColor: "purple.700",
          animation: "pendingBorderCycle",
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

// Grid-based table row (see AGENTS.md "Grid over Table"): a list of CSS grid
// rows instead of an HTML <table>, scoping reflows to individual rows.
// Cells are `position: relative` only; do NOT give them a positive z-index —
// the FloatingPanel positioner carries an inline `z-index: stackIndex + 1`
// (≈1) from Zag, so any docked/high z-index here would paint the timeline
// above open panels. Cell-vs-indicator layering falls to DOM order instead.
const gridTableRowRecipe = defineRecipe({
  className: "grid-table-row",
  base: {
    display: "grid",
    w: "full",
    columnGap: 2,
    minH: 8,
    alignItems: "center",
    "& > *": { alignItems: "center", position: "relative" },
  },
});

// Square icon-only button overrides, composed with the generated `button`
// recipe at call sites (`cx(button({ size }), iconButton())`). The preset has
// no `iconButton` recipe, so the square shape and icon sizing live here
// instead of a wrapper component.
const iconButtonRecipe = defineRecipe({
  className: "icon-button",
  base: {
    px: 0,
    py: 0,
    aspectRatio: "1",
    _icon: { fontSize: "1.2em" },
  },
});

// The "+ event" buttons that float at the top/bottom edge of a timeline row.
// `position` picks which edge (and the matching border rounding). The
// parity-based background is driven by the row's `group` class via the
// `_groupOdd`/`_groupEven` conditions (the row is the `group` ancestor), so the
// button inherits the same even/odd striping as the row it belongs to.
const addBtnWrapperRecipe = defineRecipe({
  className: "add-btn-wrapper",
  base: {
    position: "absolute",
    right: 0,
    zIndex: 20,
    _groupOdd: { bg: "bg.subtle", _hover: { bg: "bg.emphasized", color: "fg" } },
    _groupEven: { bg: "bg.muted", _hover: { bg: "bg.emphasized", color: "fg" } },
  },
  variants: {
    position: {
      before: {
        top: 0,
        transform: "translateY(-100%)",
        borderTopRadius: "md",
        borderBottomRadius: 0,
      },
      after: {
        bottom: 0,
        transform: "translateY(100%)",
        borderTopRadius: 0,
        borderBottomRadius: "md",
      },
    },
  },
  defaultVariants: { position: "before" },
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
        easings: {
          swiftOut: { value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          inOutQuad: { value: "cubic-bezier(0.45, 0, 0.55, 1)" },
        },
        // Animation tokens compose a `@keyframes` name with a duration,
        // easing token, and iteration count. Referenced via `animation` in css/recipes.
        animations: {
          pendingPulse: { value: "pulse 2s {easings.inOutQuad} infinite" },
          // Pending problem cell: border cycles bg ↔ border color
          // (React reference: MotionBox borderColor [bg, border, bg] 2s infinite).
          pendingBorderCycle: { value: "pendingBorderCycle 2s {easings.inOutQuad} infinite" },
          // Resolved problem cells: border blinks between the default `border`
          // token and the verdict's own border color. One keyframe per border
          // tone so everything stays in tokens (no CSS var plumbing). Applied
          // conditionally from problem-cell.vue — only on the LATEST resolved cell.
          resolvedBlinkSuccess: {
            value: "verdictBlinkSuccess 2s {easings.inOutQuad} infinite",
          },
          resolvedBlinkError: { value: "verdictBlinkError 2s {easings.inOutQuad} infinite" },
          resolvedBlinkWarning: { value: "verdictBlinkWarning 2s {easings.inOutQuad} infinite" },
          resolvedBlinkMuted: { value: "verdictBlinkMuted 2s {easings.inOutQuad} infinite" },
          // Current-event indicator border (React reference: `pulseBorder 1s linear infinite`).
          borderPulse: { value: "pulseBorder 1s linear infinite" },
        },
      },
      // Keyframes emit raw CSS, so token references must be real CSS variables
      // (raw names like "purple.700" are invalid CSS and get dropped).
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        pendingBorderCycle: {
          "0%, 100%": { borderColor: "var(--colors-purple-700)" },
          "50%": { borderColor: "var(--colors-cyan-400)" },
        },
        verdictBlinkSuccess: {
          "0%, 100%": { borderColor: "var(--colors-border-success)" },
          "50%": { borderColor: "var(--colors-border)" },
        },
        verdictBlinkError: {
          "0%, 100%": { borderColor: "var(--colors-border-error)" },
          "50%": { borderColor: "var(--colors-border)" },
        },
        verdictBlinkWarning: {
          "0%, 100%": { borderColor: "var(--colors-border-warning)" },
          "50%": { borderColor: "var(--colors-border)" },
        },
        verdictBlinkMuted: {
          "0%, 100%": { borderColor: "var(--colors-border-muted)" },
          "50%": { borderColor: "var(--colors-border)" },
        },
        pulseBorder: {
          "0%, 100%": { borderColor: "var(--colors-border-success)" },
          "50%": { borderColor: "var(--colors-border)" },
        },
      },
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

  // Panda only generates `_group*` variants for pseudo-state conditions,
  // not structural `nth-child` ones. These let the add-button background
  // follow the row's even/odd striping when the row carries `class="group"`.
  conditions: {
    groupOdd: ".group:nth-child(odd) &",
    groupEven: ".group:nth-child(even) &",
  },

  // The problem-cell verdict variant is chosen dynamically at runtime
  // (problemCell({ verdict: VERDICT_VARIANT[...] })), so Panda's static
  // extraction only emits the default `pending` variant and drops the rest.
  // Force-emit every verdict variant so the colored borders/backgrounds apply.
  // `addBtnWrapper` likewise picks `position`/`tone` at runtime.
  staticCss: {
    recipes: {
      problemCell: ["*"],
      addBtnWrapper: ["*"],
      gridTableRow: ["*"],
      iconButton: ["*"],
      // `Button` applies `button({ size: props.size })`, so the size class is
      // only ever computed at runtime. Force-emit every size so `size="2xs"`
      // (and any other size passed via props) has styles.
      button: [{ size: ["2xs", "xs", "sm", "md", "lg", "xl", "2xl"] }],
    },
  },

  // Prod-specific config
  minify: isProd,
  hash: isProd,
});
