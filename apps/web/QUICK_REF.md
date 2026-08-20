# Web State QUICK_REF

Global state = Preact Signals `createModel` stores. All models live in their feature
directories (`src/features/*/`). Import directly from the feature path
(e.g. `@/features/shared/show-model`, `@/features/control/playback-model`).

Read with `.value`; render display-only signals straight in JSX: `<>{model.field}</>`.
Call actions as methods.

## What state is available

| Model | Location | Public fields (signals) | Actions |
|---|---|---|---|
| `realtimeModel` | `@/features/shared/realtime-model` | `connectionStatus`, `bigRefetching` | — |
| `showModel` | `@/features/shared/show-model` | `showEvents`, `showOrderedIds`, `showMode`, `dataVersion`, `showMeta`, `showFile`, `rows` (computed) | `hydrateFromSnapshot(show)`, `tryApplyShowMessage(msg)` |
| `playbackModel` | `@/features/control/playback-model` | `state`, `currentEventId` (computed), `currentCueId` (computed), `status` (computed) | `update(p)`, `reset(v?)`, `syncFromSnapshot(v, snap)` |
| `controlNowModel` | `@/features/control/control-now-model` | `now` | `setNow(n)` |
| `confirmActionModel` | `@/features/shared/confirm-action-model` | `open`, `title`, `message`, `confirmLabel`, `cancelLabel`, `showInput`, `inputLabel`, `inputValue` | `confirmAction(p)`, `promptAction(p)`, `resolveConfirmAction(ok)`, `setInputValue(v)` |
| `fullscreenModel` | `@/features/shared/full-screen-model` | `isFullscreen` | `toggleFullscreen()` |
| `floatingPanelModel` | `@/features/control/floating-panel-model` | `panels`, `hasDirtyPanels` (computed) | `openFloatingPanel(...) → FloatingPanelHandle`, `requestFloatingPanelClose(handle, r?)`, `closeFloatingPanel(handle, accepted)` |
| `leaderboardModel` | `@/features/leaderboard/leaderboard-model` | `userIds`, `currentBottomView`, `currentResolvedUserId`, `getSignal(id)` | `sync(show, upToEventId?)` |
| `assetsManagerModel` | `@/features/assets-manager/assets-manager-model` | `folderTree`, `selectedEntryId`, `selectedIds`, `viewMode`, `expandedFolderIds`, `entries` (computed), `focusedPanel` | `selectEntry(id)`, `clearSelection()`, `handleEntryClick(e, idx)`, `setViewMode(m)`, `toggleFolder(id)`, `expandAll()`, `collapseAll()`, `createFolder(pid, name)`, `uploadAsset(fid, file)`, `renameEntry(id, isDir, name)`, `deleteEntry(id, isDir)`, `findEntry(id)`, `findEntryName(id)`, `applyShowState(data)`, `setInvalidateCache(fn)`, `ensureFolderPath(root, parts)` |

Other model files: `floating-panel-types.ts` (`@/features/control`). `floating-panel-model.ts`
also exports the `FloatingPanelHandle` type (per-panel `isDirty`/`isSaving` signals, `result`
promise, `close(accepted)` / `requestClose(reason?)` actions).

Non-`createModel` singletons: `extensionRegistry` (`@/features/extensions/base/registry`) — static
extension registry (`extensionList`, `extensionWithExtId(id)`, `configFormFor(id)`);
`sharedRendererRegistry` (`@/features/extensions/renderers`) — TGB Form field renderers.

## Feature directories (model locations)

Models live alongside their feature code. The table below shows where each feature's models reside.

| Directory | Role |
|---|---|
| `@/features/control/` | Control panel UI (timeline, transport, cue tab) |
| `@/features/leaderboard/` | Leaderboard grid/table views |
| `@/features/assets-manager/` | Folder/file asset browser with tree view |
| `@/features/shared/` | Shared UI components used across features |
| `@/features/extensions/` | Extension registry, config UI, server patch API |

## Declare a new store (`src/features/<feature>/my-model.ts`)

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

Then import directly from the feature path: `import { myModel } from "@/features/<feature>/my-model";`.

## Subscribe in a component

```tsx
import { myModel } from "@/features/control/playback-model";

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
# Legacy frontend reference

The React app is retained as the legacy porting reference. For the canonical frontend, see
[`apps/web-vue/QUICK_REF.md`](../web-vue/QUICK_REF.md) and the root `AGENTS.md`.
