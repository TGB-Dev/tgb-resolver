import { defineKeyframes } from "@pandacss/dev";

// All border animations share one keyframe shape (A -> B -> A) and animate
// between the `--pulse-from` / `--pulse-to` custom properties set by the
// calling recipe variant. Keyframes emit raw CSS that Panda does NOT rewrite
// under `hash`, so they must not reference token variables directly
// (--colors-* names cease to exist when hashing is on). Recipe declarations,
// by contrast, go through the compiler, so their `{token}` references resolve
// to the correct - possibly hashed - variable names.
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
