# Timeline + Assets Manager Interaction Design

Date: 2026-08-02
Repo: `tgb-resolver`
Scope: Timeline CUS delete confirmation, assets context-menu reliability, centralized DnD + clipboard interactions

## Goals

1. Timeline: right-click row opens context menu; CUS events are deletable and always require confirmation before delete.
2. Assets manager: fix intermittent context-menu no-show in list/grid viewers.
3. Assets manager: implement VSCode/File Explorer-like moving/copying/pasting with drag-and-drop, keyboard shortcuts, and context-menu commands.
4. Centralize interaction logic so list/grid/tree stay presentation-focused and behavior stays consistent.
5. Support external file/folder drag-drop upload in both grid and list views.

## Non-goals

1. Replacing current backend API surface unless needed for missing batch/copy behavior.
2. Refactoring unrelated feature modules outside control timeline and assets manager.

## Architecture

### 1) Centralized assets interaction model

Add a new model (e.g. `assets-interaction-model.ts`) that owns cross-view interaction state and commands:

- Clipboard: `mode: "copy" | "cut" | null`, `entryIds: string[]`, `sourceFolderId: string | null`.
- Drag session: `draggingIds`, `dropTargetId`, `dropEffect: "move" | "copy" | null`.
- Target resolution helpers:
  - if initiating item is already selected, target set = all selected ids
  - else target set = initiating item id only
- Commands:
  - `copySelection()`, `cutSelection()`
  - `pasteInto(targetFolderId)`
  - `dropOnto(targetFolderId, modifierState)`
  - `canPasteInto(targetFolderId)`, `canDropOnto(targetFolderId)`

Existing `assets-manager-model` keeps domain/navigation state (`entries`, `selectedIds`, `selectedEntryId`), while the new model handles interaction workflows and dispatches actions to existing mutation methods.

### 2) Shared context-menu trigger plumbing

Create a shared trigger helper/hook for context-menu opening/closing used by list and grid viewers. This removes diverging event handling and race conditions with:

- rubber-band pointer handlers
- global `mousedown/contextmenu` close listeners
- item-vs-container right-click dispatch

### 3) Timeline row action integration

In timeline row rendering, expose delete action only for `TimelineEventType.CUS`. Deletion path is:

`context menu action -> confirmActionModel.confirmAction(...) -> delete mutation`

No confirmation bypass path is allowed.

## Behavior Design

## A) Timeline

- Right-click any row opens row context menu.
- Delete entry appears only for CUS rows.
- Confirm dialog title/message is explicit about event id/name.
- Cancel leaves state untouched; confirm triggers delete mutation once.

## B) Assets: drag/drop move-copy

- Drag source set:
  - dragging selected item => all selected entries
  - dragging unselected item => just that entry
- Drop targets:
  - folder entries
  - content container root (current folder)
- Effect:
  - default move
  - hold `Alt/Option` during drag for copy
- Batch command execution per drop operation (single orchestrated flow, multi-entry aware).

Invalid operations are blocked before dispatch:

- self-drop
- moving folder into its own descendant
- no-op same parent/no actual change

## C) Assets: clipboard and shortcuts

Implement browser explorer semantics:

- `Cmd/Ctrl + C`: copy selected entries
- `Cmd/Ctrl + X`: cut selected entries
- `Cmd/Ctrl + V`: paste into focused/current folder target
- Context menu mirrors Copy/Cut/Paste and calls same centralized commands.

Paste action is disabled when clipboard is empty or target invalid.

## D) Assets: external drag-drop upload

Enable dropping files/folders from OS into both list and grid viewers:

- drop on container background => upload into current folder
- drop on folder entry/card => upload into that folder
- folder structures from dropped directories are preserved through existing upload pipeline (`processUploadBatch` path-part mapping)
- integrate with existing upload progress behavior; no separate upload implementation path

## Data Flow

1. UI event (context menu, keybind, drag/drop) occurs in list/grid/tree/timeline.
2. Event is normalized and delegated to centralized interaction command.
3. Command validates target and operation.
4. Command dispatches mutations via existing model methods/endpoints.
5. Post-operation state sync:
   - refresh entries
   - preserve valid selection where possible; clear stale ids otherwise
   - always close context menu overlay after command dispatch

## Error Handling

- No silent catches or success-shaped fallbacks.
- Errors surface through existing mutation error paths.
- Context menu/drag overlay state is reset deterministically even when operation fails.
- Invalid target operations are explicitly rejected and do not dispatch network calls.

## Testing Strategy

1. **Assets interaction model unit tests**
   - source set resolution (single vs selected set)
   - copy/cut/paste transitions
   - move vs copy effect selection with modifier
   - invalid target guards

2. **Assets view interaction tests (list + grid)**
   - context menu reliably opens on item and container right-click
   - multi-select command dispatch behavior
   - external file/folder drop maps to expected upload calls/targets

3. **Timeline tests**
   - CUS row shows delete action
   - delete requires confirm
   - non-CUS rows do not expose delete

## Implementation Sequence (high-level)

1. Add `assets-interaction-model` and shared context-menu trigger utility.
2. Wire list/grid/tree to centralized interaction commands.
3. Add keyboard shortcut handling for content panel focus.
4. Add DnD move/copy and external drop-upload integration in list/grid.
5. Add timeline CUS delete-with-confirm context-menu action.
6. Add/update tests for timeline and assets interactions.
