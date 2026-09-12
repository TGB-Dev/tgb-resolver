<!-- intent-skills:start -->

## Skill loading

- Before substantial edits:
  - Run `pnpm dlx @tanstack/intent@latest list` from workspace root
  - If a listed skill matches, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>`
  - Follow the loaded `SKILL.md` while changing files
- Monorepos:
  - Run skill check from workspace root
  - Prefer the local skill for the package being changed
- Multiple matches:
  - Prefer the most specific local skill
  - Load extras only when the task spans packages/concerns

<!-- intent-skills:end -->

## Design tokens

- Tokens live in `apps/web/panda.config.ts` under `theme.extend`
- Consumed through generated CSS variables
- Never hardcode curves, keyframes, durations, colors
- See [QUICK_REF.md](./QUICK_REF.md) for the full token map + examples
