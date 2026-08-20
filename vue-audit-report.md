# apps/web-vue — Defect Audit Report
_Generated: 2026-08-20_

## Summary

The Vue port has a working skeleton but suffers from **fabricated quality** — files exist, typechecks pass, but the implementation is at most 30-40% of what the React reference delivers. Key categories of defects:

---

## Defect Inventory

### 🔴 CRITICAL — DND-Kit: GPU-burning translate3d
**File:** `timeline-sortable-row.vue`

The current implementation manually computes a `rowStyle` with `translate3d(...)` from the transform returned by `useSortable`. This is **wrong** per https://dndkit.com/vue/composables/use-sortable/ — `@dnd-kit/vue` composables with `useSortable` auto-apply transforms via the element ref. The manual `translate3d` causes composite layer thrashing.

**Fix:** Remove `rowStyle` computed and `:style="rowStyle"` binding entirely. `useSortable` applies transforms automatically when `element` ref is provided.

---

### 🔴 CRITICAL — Raw `<input>` instead of `Editable.*` (Ark UI)
**File:** `timeline-number-editable.vue`

Uses a raw `<input>` toggled with `v-if/v-else` instead of Ark UI's `EditableRoot`, `EditableArea`, `EditableInput`, `EditablePreview` components which handle accessible inline editing with proper focus management. Also uses `input()` recipe (styling only) on a raw `<button>` which is wrong usage.

**Fix:** Port to full `Editable.*` anatomy from `@ark-ui/vue` + `editable` recipe from `@styled-system/recipes`.

---

### 🔴 CRITICAL — Timeline header is a plain string — columns don't align
**File:** `timeline-table-header.vue`

Header is just a Box with a plain string "# · Type · Name · Problem · Score · Rank · Duration · Offset · Manual". It does NOT use `GridTableRow` with the same `timelineTableGridTemplateColumns` that rows use — so columns never align.

**Fix:** Rebuild as `GridTableRow` with matching `timelineTableGridTemplateColumnsStatic` and proper cell content per column.

---

### 🔴 CRITICAL — Timeline item: emoji drag handle, wrong events, missing live/edit modes
**File:** `timeline-table-item.vue`

1. Emoji `⋮⋮` as drag handle instead of `GripVertical` icon from `@lucide/vue`
2. `@dblclick` on the row seeks — should open extension config for CUS events (React ref: `floatingPanelModel.openFloatingPanel(ExtensionConfig, ...)`)
3. No live/edit mode conditional — always renders editable columns even when `isLive=true`
4. Uses raw `<Grid>` instead of shared `<GridTableRow>` component
5. Missing `textAlign="end"` / `fontFamily="mono"` on numeric columns

---

### 🟠 HIGH — Leaderboard uses `<table>` instead of CSS Grid
**Files:** `leaderboard-table.vue`, `leaderboard-row.vue`

Per AGENTS.md: **Grid over Table**. Current implementation uses literal `<table>` with `table` recipe. Must be ported to `GridTableRow` + `gridTableTemplate()`. The `table` recipe should not be used for the leaderboard.

---

### 🟠 HIGH — Missing `SwitchThumb` from Switch anatomy
**File:** `control-main-controls.vue`

`SwitchRoot / SwitchControl / SwitchHiddenInput / SwitchLabel` present but `SwitchThumb` (the visual toggle indicator) is missing. Ark UI requires the full anatomy to render correctly.

---

### 🟠 HIGH — `DialogBackdrop` missing in both dialogs
**Files:** `floating-panel-host.vue`, `control-confirm-dialog.vue`

Both `DialogRoot` usages are missing `DialogBackdrop` from Ark's dialog anatomy. Without it there's no overlay/backdrop behind the dialog, breaking a11y and visual layering.

---

### 🟠 HIGH — `<p color="fg.muted">` — invalid HTML attribute in big-refetch-overlay
**File:** `big-refetch-overlay.vue` line 23

`<p color="fg.muted" fontSize="sm">Syncing show…</p>` — `color` and `fontSize` are not props of `<p>`. This renders literal HTML attributes and applies no styles. Must be wrapped in `<Box as="p">` or `<Text>`.

---

### 🟠 HIGH — ControlConfirmDialog and FloatingPanelHost inside Grid as row children
**File:** `control-route.vue`

Both `<ControlConfirmDialog />` and `<FloatingPanelHost />` are inside the Grid layout as grid children. Both should be fixed-positioned overlays rendered outside the layout. The dialogs need `DialogBackdrop` which uses `position: fixed` — but being inside a CSS Grid parent may interfere with stacking context.

---

### 🟠 HIGH — Assets manager entry components are stubs
**Files:** `entry-card.vue`, `entry-row.vue`, `entry-menu.vue`, `context-menu-overlay.vue`

All are near-empty stubs. `EntryCard` and `EntryRow` just render `<div>{{ entry.name }}</div>`. The React reference has full card/row with Folder/File icons, selection state styling, context menu trigger, double-click navigation.

---

### 🟠 HIGH — Grid/List views bypass EntryCard/EntryRow components
**Files:** `assets-grid-view.vue`, `assets-list-view.vue`

Both render inline `<button>` elements directly, bypassing `EntryCard`/`EntryRow`. This defeats component reuse and makes the stub components completely dead code.

---

### 🟡 MEDIUM — Tab stubs: Preview, Cue, Info, Settings
**Files:** `control-main-preview-tab.vue`, `control-main-cue-tab.vue`, `control-main-info-tab.vue`, `control-main-settings-tab.vue`

All four tabs are empty stubs with just a label Box. Full React implementations exist in `apps/web/src/features/control/`.

---

### 🟡 MEDIUM — Panel stubs: Create, Import, Inspect
**Files:** `create-event-panel.vue`, `import-show-panel.vue`, `inspect-show-panel.vue`

All three panels are minimal stubs. `import-show-panel.vue` uses a bare `<input type="file">` instead of Ark FileUpload. The floating panel host doesn't even wire these panels — only `ExtensionConfig` is handled.

---

### 🟡 MEDIUM — knip.json silences 15+ real issues
`knip.json` `ignore` list contains stub components and disconnected files that should be wired, not silenced:
`entry-card.vue`, `entry-row.vue`, `entry-menu.vue`, `context-menu-overlay.vue`, `create-event-panel.vue`, `import-show-panel.vue`, `inspect-show-panel.vue`, `cue-content.vue`, `resolve-content.vue`, `grid-table-row.vue`, `motion-factories.ts`, `verdict.ts`, `easings.ts`, `error-page.vue`, `not-found-page.vue`

---

### 🟡 MEDIUM — Toaster missing `ToastGroup` positioning wrapper
**File:** `toaster.vue`

The Ark `Toaster` component needs the recipe's `group` class applied for positioning (bottom-end, fixed). Currently the group class is not applied.

---

### 🟡 MEDIUM — Template formatting: ~15 SFCs with single-line templates
Multiple Vue SFCs have their entire template collapsed to one line. This is unreadable and unmaintainable. Affects: `timeline-table-item.vue`, `timeline-number-editable.vue`, `timeline-manual-interaction.vue`, `timeline-add-buttons.vue`, `current-event-indicator.vue`, `leaderboard.vue`, `leaderboard-table.vue`, `leaderboard-row.vue`, `assets-manager.vue`, `folder-tree-view.vue`, `assets-toolbar.vue`, `assets-grid-view.vue`, `assets-list-view.vue`.

---

### 🟢 LOW — Empty `<style scoped>` in assets tab
**File:** `control-main-assets-tab.vue` line 7 — empty scoped style block.

---

## Prioritized Fix Order

| Priority | Issue | File(s) |
|----------|-------|---------|
| 1 | DND-Kit translate3d removal | `timeline-sortable-row.vue` |
| 2 | Timeline item rebuild (GridTableRow, live/edit, GripVertical, proper events) | `timeline-table-item.vue` |
| 3 | Timeline header alignment | `timeline-table-header.vue` |
| 4 | Editable → Ark Editable.* | `timeline-number-editable.vue` |
| 5 | SwitchThumb anatomy | `control-main-controls.vue` |
| 6 | DialogBackdrop in both dialogs | `floating-panel-host.vue`, `control-confirm-dialog.vue` |
| 7 | Fix `<p color=...>` | `big-refetch-overlay.vue` |
| 8 | Leaderboard Grid over Table | `leaderboard-table.vue`, `leaderboard-row.vue` |
| 9 | EntryCard/EntryRow implementation | entry components |
| 10 | Grid/List views use EntryCard/EntryRow | grid/list view files |
| 11 | Toaster group class | `toaster.vue` |
| 12 | Tab stubs — CueTab (port react cue-tab) | `control-main-cue-tab.vue` |
| 13 | Expand all single-line templates | ~15 files |
| 14 | knip.json cleanup | `knip.json` |
