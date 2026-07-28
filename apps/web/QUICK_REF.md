# Web State QUICK_REF

Global state = Preact Signals `createModel` stores. Core models live in `src/models/`,
re-exported from `src/models/index.ts`. Import from `@/models`. Feature-specific models
(e.g. `assetsManagerModel`) live in their feature directory — import directly from
`@/features/assets-manager/assets-manager-model`.

Read with `.value`; render display-only signals straight in JSX: `<>{model.field}</>`.
Call actions as methods.

## What state is available

| Model | Location | Public fields (signals) | Actions |
|---|---|---|---|
| `realtimeModel` | `@/models` | `connectionStatus`, `bigRefetching` | — |
| `showModel` | `@/models` | `showEvents`, `showOrderedIds`, `showMode`, `dataVersion`, `showMeta`, `showFile`, `rows` (computed) | `hydrateFromSnapshot(show)`, `tryApplyShowMessage(msg)` |
| `playbackModel` | `@/models` | `state`, `currentEventId` (computed), `currentCueId` (computed), `status` (computed) | `update(p)`, `reset(v?)`, `syncFromSnapshot(v, snap)` |
| `controlNowModel` | `@/models` | `now` | `setNow(n)` |
| `confirmActionModel` | `@/models` | `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `showInput`, `inputLabel`, `inputValue` | `confirmAction(p)`, `promptAction(p)`, `resolveConfirmAction(ok)`, `setInputValue(v)` |
| `fullscreenModel` | `@/models` | `isFullscreen` | `toggleFullscreen()` |
| `floatingPanelModel` | `@/models` | `active`, `isDirty` | `openFloatingPanel(...)`, `closeFloatingPanel(b)`, `requestFloatingPanelClose(r?)`, `setDirty(b)` |
| `leaderboardModel` | `@/models` | `userIds`, `currentBottomView`, `currentResolvedUserId`, `getSignal(id)` | `sync(show, upToEventId?)` |
| `assetsManagerModel` | `@/features/assets-manager` | `folderTree`, `selectedEntryId`, `selectedIds`, `viewMode`, `expandedFolderIds`, `entries` (computed), `focusedPanel` | `selectEntry(id)`, `clearSelection()`, `handleEntryClick(e, idx)`, `setViewMode(m)`, `toggleFolder(id)`, `expandAll()`, `collapseAll()`, `createFolder(pid, name)`, `uploadAsset(fid, file)`, `renameEntry(id, isDir, name)`, `deleteEntry(id, isDir)`, `findEntry(id)`, `findEntryName(id)`, `applyShowState(data)`, `setInvalidateCache(fn)`, `ensureFolderPath(root, parts)` |

## Declare a new store (`src/models/my-model.ts`)

```ts
import { createModel, signal, computed, type ReadonlySignal, type Signal } from "@preact/signals-react";

interface MyModelState {
  count: Signal<number>;
  double: ReadonlySignal<number>;
  increment: () => void;
}

const MyModel = createModel<MyModelState>(() => {
  const count = signal(0);
  const double = computed(() => count.value * 2);
  return {
    count,
    double,
    increment: () => {
      count.value += 1;
    },
  };
});

export const myModel = new MyModel();
```

Then add `export { myModel } from "./my-model";` to `src/models/index.ts`.

## Subscribe in a component

```tsx
import { myModel } from "@/models";

function Counter() {
  // reading .value auto-subscribes this component (preact/signals-react transform)
  return <button onClick={myModel.increment}>Count: {myModel.count.value}</button>;
  // display-only? drop .value: <>{myModel.count}</>
}
```

## Rules (short)
- NO `useState`/`useReducer`/`createContext` for shared state. Use a store.
- Local-only UI state may use `useState`.
- TanStack Query owns async server cache; signals own reactive state.
- See `AGENTS.md` → "Frontend state (Preact Signals)" for the full rules.

## Docs
- Preact Signals: https://preactjs.com/guide/v10/signals/
- `createModel` / `useModel`: https://github.com/preactjs/signals/tree/main/packages/react-runtime
- `@preact/signals-react`: https://www.npmjs.com/package/@preact/signals-react
