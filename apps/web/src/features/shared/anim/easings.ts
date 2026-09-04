// Runtime (Motion) mirror of the Panda CSS `easings` tokens defined in
// `apps/web-vue/panda.config.ts` (`easings.inOutQuad`, `easings.swiftOut`).
// `motion`'s `animate()` needs JS easing values (not CSS vars), so keep these
// two sources in sync when an easing changes.
export const TgbResolverEasings = {
  inOutQuad: [0.45, 0, 0.55, 1] as const,
  swiftOut: [0.2, 0.8, 0.2, 1] as const,
};
