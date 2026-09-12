# Vue frontend QUICK_REF

- `apps/web`: Vue 3 SPA frontend
- Vue 3.5 SFCs
- Pinia setup stores
- TanStack Vue Query
- Ark UI
- Panda CSS via Chakra preset
- See root [AGENTS.md](../../AGENTS.md) for workspace-wide conventions

## Commands

```sh
pnpm --filter @tgb-resolver/web dev
pnpm --filter @tgb-resolver/web check-types
pnpm --filter @tgb-resolver/web test
pnpm --filter @tgb-resolver/web test:e2e
```

## State

- Shared state in Pinia setup stores
- Component-local state in Vue refs
- HTTP contracts from `@tgb-resolver/contracts`
- Realtime contracts from `@tgb-resolver/realtime`

## Styling

- Ark primitives receive generated Panda slot recipes via `:class`
- Reusable controls use generated recipes from `@styled-system/recipes`
- Merge overrides with `cx(recipe(...), css(...))`
- Use Panda conditionals:
  - `_hover`
  - `_disabled`
  - `_selected`
- No scoped component CSS for component styling
- Custom wrappers for missing Panda/Ark baseline components:
  - Thin Vue component mapping 1:1 to its Chakra counterpart
  - Example: `IconButton` in `src/features/shared/ui/icon-button.vue`
    - `button` recipe + `padding: 0`
    - `borderRadius: l1`
    - Per-size child-`<svg>` sizing mirrors Chakra `IconButton`
  - Keep mapping explicit so visuals stay in sync

## Keyboard shortcuts

- System lives in `src/features/shortcuts/`
- `scope` MUST use `CommandScope` enum from `types.ts`
- `kind` MUST use `CommandBindingKind` enum from `types.ts`
- Never raw string literals
- New scope/kind requires:
  - New enum member
  - Updated `satisfies` checks
  - Updated discriminated unions

## Types

- Prefer direct annotations over `satisfies`
  - Write `const foo: readonly T[] = [...]`
  - Not `const foo = [...] satisfies T`
  - Direct annotation gives the exact type
  - `satisfies` only checks, leaves wider inferred type
  - Reserve `satisfies` for preserving narrower inferred type

## Design tokens

- Defined in `panda.config.ts` under `theme.extend`
- Consumed through generated CSS variables
- Never hardcode:
  - cubic-bezier curves
  - keyframes
  - durations
  - raw colors
- Add a token, then reference it

- Colors:
  - Chakra semantic tokens (`bg.*`, `fg.*`, `border.*`)
  - Full Tailwind scales (e.g. `green.600`, `red.500`)

- Easings (`tokens.easings`):
  - `swiftOut`: `cubic-bezier(0.2,0.8,0.2,1)`
  - `inOutQuad`: `cubic-bezier(0.45,0,0.55,1)`
  - Reference in `css()`:
    - Bare token name: `transitionTimingFunction: "swiftOut"`
    - Resolves to `var(--easings-swift-out)`
    - Or write the CSS var directly
    - Inside `animations` token: `{easings.inOutQuad}` syntax

- Keyframes (`theme.extend.keyframes`):
  - Named `@keyframes`
  - Example: `pulse`
    - `{ "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } }`

- Animations (`tokens.animations`):
  - Compose keyframe + duration + easing
  - Example: `pendingPulse: { value: "pulse 2s {easings.inOutQuad} infinite" }`
  - Use via `animation: "pendingPulse"` in `css()` or slot recipes

- JS animations (Motion):
  - `src/features/shared/anim/easings.ts` exports `TgbResolverEasings`
  - Same cubic-bezier values for `motion`'s `animate()`
  - Needs runtime JS, not CSS vars
  - Keep in sync with Panda `easings` tokens

```ts
// panda.config.ts
theme: {
  extend: {
    tokens: {
      easings: {
        swiftOut: { value: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
        inOutQuad: { value: "cubic-bezier(0.45, 0, 0.55, 1)" },
      },
      animations: {
        pendingPulse: { value: "pulse 2s {easings.inOutQuad} infinite" },
      },
    },
    keyframes: {
      pulse: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.5 } },
    },
  },
}

// usage in css() / slot recipe
css({ transitionTimingFunction: "swiftOut" }) // resolves to var(--easings-swift-out)
css({ animation: "pendingPulse" })
```

## Feature layout

- `src/features/control`:
  - Playback, timeline, transport, cue tab
- `src/features/leaderboard`:
  - Leaderboard grid/table
- `src/features/assets-manager`:
  - Folder/file browser
- `src/features/extensions`:
  - Registry, config UI
- `src/features/shared`:
  - Cross-feature UI
- `src/stores`:
  - Cross-feature Pinia stores
- `src/lib`:
  - Framework-free domain + transport helpers
