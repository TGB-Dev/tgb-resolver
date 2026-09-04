import { defineSlotRecipe } from "@pandacss/dev";

// The leaderboard problem cell is the one component whose anatomy needs a
// hand-authored Panda slot recipe: it has multiple parts (root box, score
// text, verdict text) and a per-verdict color that must be precompiled (the
// React port used runtime @emotion/css composition, which Panda cannot do).
export const problemCellSlotRecipe = defineSlotRecipe({
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
          // Drives the shared borderColorPulse keyframe (see panda/keyframes.ts).
          "--pulse-from": "{colors.purple.700}",
          "--pulse-to": "{colors.cyan.400}",
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
    // Border blink applied to the LATEST resolved cell only; the tone picks
    // which colors the shared borderColorPulse keyframe cycles between
    // (verdict border tone -> default border token).
    blink: {
      none: {},
      success: {
        root: {
          "--pulse-from": "{colors.border.success}",
          "--pulse-to": "{colors.border}",
          animation: "resolvedBlink",
        },
      },
      error: {
        root: {
          "--pulse-from": "{colors.border.error}",
          "--pulse-to": "{colors.border}",
          animation: "resolvedBlink",
        },
      },
      warning: {
        root: {
          "--pulse-from": "{colors.border.warning}",
          "--pulse-to": "{colors.border}",
          animation: "resolvedBlink",
        },
      },
      muted: {
        root: {
          "--pulse-from": "{colors.border.muted}",
          "--pulse-to": "{colors.border}",
          animation: "resolvedBlink",
        },
      },
    },
  },
  defaultVariants: { verdict: "pending", blink: "none" },
});
