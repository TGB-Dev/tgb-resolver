export const fontTokens = {
  sans: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
  serif: { value: ["Lora Variable", "ui-serif", "serif"] },
  mono: { value: ["JetBrains Mono Variable", "ui-monospace", "monospace"] },
  body: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
  heading: { value: ["Noto Sans Display Variable", "ui-sans-serif", "sans-serif"] },
};

export const easingTokens = {
  swiftOut: { value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
  inOutQuad: { value: "cubic-bezier(0.45, 0, 0.55, 1)" },
};

// Animation tokens compose a `@keyframes` name with a duration,
// easing token, and iteration count. Referenced via `animation` in css/recipes.
// All border animations drive `borderColorPulse`, which animates between the
// `--pulse-from` / `--pulse-to` custom properties set by the calling variant.
export const animationTokens = {
  pendingPulse: { value: "pulse 2s {easings.inOutQuad} infinite" },
  // Pending problem cell: border cycles purple -> cyan (React reference:
  // MotionBox borderColor [bg, border, bg] 2s infinite).
  pendingBorderCycle: { value: "borderColorPulse 2s {easings.inOutQuad} infinite" },
  // Resolved problem cells: border blinks between the default `border` token
  // and the verdict's own border tone. Applied to the LATEST resolved cell
  // only, via the recipe's `blink` variant.
  resolvedBlink: { value: "borderColorPulse 2s {easings.inOutQuad} infinite" },
  // Current-event indicator border (React reference: `pulseBorder 1s linear infinite`).
  borderPulse: { value: "borderColorPulse 1s linear infinite" },
};
