import { defineKeyframes } from "@pandacss/dev";

export const keyframes = defineKeyframes({
  pulse: {
    "0%, 100%": { opacity: 1 },
    "50%": { opacity: 0.5 },
  },
  borderColorPulse: {
    "0%, 100%": { borderColor: "var(--pulse-from)" },
    "50%": { borderColor: "var(--pulse-to)" },
  },
});
