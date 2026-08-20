# web-vue — canonical frontend

The canonical Vue 3 SPA for tgb-resolver. The legacy React app remains in `apps/web` as the
porting reference until migration parity is complete.

Stack: Vue 3.5, Pinia, vue-router, TanStack Vue Query, Panda CSS with the Chakra preset, Ark UI,
`motion-v`, and the vanilla `motion` core package.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Commands

```sh
pnpm install
```

### Development

```sh
pnpm dev
```

### Production build and preview

```sh
  pnpm build
  pnpm serve
```

### Unit tests and type-check

```sh
pnpm test
pnpm type-check
```

### Run End-to-End Tests with [Playwright](https://playwright.dev)

```sh
# Install browsers for the first run
npx playwright install

pnpm test:e2e
```

Feature code is vertically sliced under `src/features/`; shared state uses Pinia setup stores.
Use generated styled-system JSX components and recipes for layout and component styling. See the
root `AGENTS.md` for the complete React-to-Vue porting rules.
