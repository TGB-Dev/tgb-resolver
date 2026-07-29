import type { Easing } from "motion/react";

// Grabbed from https://www.easing.dev/
export const TgbResolverEasings: Record<string, Easing> = {
  swiftOut: [0.175, 0.885, 0.32, 1.1],
  inOutQuad: [0.455, 0.03, 0.515, 0.955],
};
