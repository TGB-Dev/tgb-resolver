# web — Vue frontend

- Vue 3 SPA for tgb-resolver

- Stack:
  - Vue 3.5
  - Pinia
  - vue-router
  - TanStack Vue Query
  - Panda CSS + Chakra preset
  - Ark UI
  - `motion-v` + vanilla `motion` core

- See [QUICK_REF.md](./QUICK_REF.md) for state, styling, tokens, layout
- See root [AGENTS.md](../../AGENTS.md) for workspace conventions

## Recommended IDE setup

- [VS Code](https://code.visualstudio.com/)
- [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- Disable Vetur

## Recommended browser setup

- Chromium (Chrome, Edge, Brave):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd)
  - [Turn on Custom Object Formatter](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Type support for `.vue` imports

- TypeScript cannot type `.vue` imports by default
- We replace `tsc` with `vue-tsc` for type checking
- Editors need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) for `.vue` types

## Customize configuration

- See [Vite Configuration Reference](https://vite.dev/config/)

## Commands

```sh
pnpm install
```

- Development:
  ```sh
  pnpm dev
  ```
- Production build + preview:
  ```sh
  pnpm build
  pnpm serve
  ```
- Unit tests + type-check:
  ```sh
  pnpm test
  pnpm type-check
  ```
- E2E with [Playwright](https://playwright.dev):
  ```sh
  npx playwright install
  pnpm test:e2e
  ```

## Layout

- Feature code vertically sliced under `src/features/`
- Shared state uses Pinia setup stores
- Styling uses generated styled-system JSX + recipes
