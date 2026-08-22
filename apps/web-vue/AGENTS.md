<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

## Design tokens (Panda CSS)

Tokens live in `apps/web-vue/panda.config.ts` under `theme.extend` and are consumed through
generated CSS variables. **Never hardcode cubic-bezier curves, keyframes, durations, or colors** —
add a token and reference it.

- **Easings** (`tokens.easings`): `swiftOut`, `inOutQuad`. Use in `css()` as the bare token name
  for the matching property — `transitionTimingFunction: "swiftOut"` (resolves to `var(--easings-swift-out)`)
  — or write `var(--easings-swift-out)` directly; reference inside an `animations` token via
  `{easings.inOutQuad}`.
- **Keyframes** (`theme.extend.keyframes`): named `@keyframes`, e.g. `pulse`.
- **Animations** (`tokens.animations`): compose a keyframe + duration + easing token, e.g.
  `pendingPulse: { value: "pulse 2s {easings.inOutQuad} infinite" }`; use via `animation: "pendingPulse"`
  in `css()` or slot recipes.
- **JS animations (Motion)**: `src/features/shared/anim/easings.ts` exports `TgbResolverEasings`
  (same cubic-bezier values) for `motion`'s `animate()`; keep it in sync with the Panda `easings`
  tokens.

See `QUICK_REF.md` for the full token map and code examples.
