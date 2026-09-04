import { css } from "@styled-system/css";

/** Monospace, tabular text style for clock/status readouts (was `mono-text.vue`). */
export const monoTextCss = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
  fontSmoothing: "subpixel-antialiased",
  mx: 1,
});
