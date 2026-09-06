import type { HotkeyCallback } from "@tanstack/vue-hotkeys";
import {
  generatedClient,
  PlaybackStatus,
  resetPlayback,
  seekPlayback,
  startPlayback,
} from "@tgb-resolver/contracts";

import { useAssetsInteractionStore } from "@/features/assets-manager/assets-interaction-store";
import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";
import { useControlShowRows } from "@/features/control/composables/use-show";
import {
  ControlEditMainPanelTab,
  useControlEditMainPanelStore,
} from "@/features/control/control-edit-main-panel-store";
import { usePlaybackStore } from "@/features/control/playback-store";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { parseErrorMessage } from "@/features/shared/ui/error-message";
import { toaster } from "@/features/shared/ui/toaster";
import { useColorModeStore } from "@/stores/color-mode-store";
import { useConfirmActionStore } from "@/stores/confirm-action-store";
import { useRealtimeStore } from "@/stores/realtime-store";
import { useShowStore } from "@/stores/show-store";

import { CommandBindingKind, type CommandDefinition, type CommandId, CommandScope } from "./types";

const SHORTCUTS_OPEN_EVENT = "tgb:shortcuts:open";

/**
 * Returns true when a text-entry element currently holds focus. Used so the
 * "?" shortcuts overlay only opens when nothing editable is focused (mirrors
 * the library's `ignoreInputs` but also excludes focused buttons/links).
 */
function isEditableTargetFocused(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}

const openShortcutsCommand: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  window.dispatchEvent(new CustomEvent(SHORTCUTS_OPEN_EVENT));
};

const toggleColorMode: HotkeyCallback = () => {
  useColorModeStore().toggleColorMode();
};

const toggleFullscreen: HotkeyCallback = () => {
  const target = document.documentElement;
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else if (target.requestFullscreen) {
    void target.requestFullscreen();
  }
};

function isSeekable(): boolean {
  const playback = usePlaybackStore();
  const connected = useRealtimeStore().connectionStatus === "connected";
  const seekable =
    playback.status === PlaybackStatus.RUNNING || playback.status === PlaybackStatus.PAUSED;
  return connected && seekable;
}

function seekRelative(delta: 1 | -1): void {
  const showStore = useShowStore();
  const playback = usePlaybackStore();
  const rows = showStore.rows;
  if (rows.length === 0) return;
  const currentId = playback.currentEventId;
  const idx = currentId != null ? rows.findIndex((row) => row.id === currentId) : -1;
  const target = rows[idx + delta];
  if (!target) return;
  // Mirror the mouse transport buttons: only seek once the show is playing or
  // paused, never on an idle show.
  if (!isSeekable()) return;
  void seekPlayback({
    client: generatedClient,
    body: { showVersion: playback.state.showVersion, eventId: target.id },
  });
}

const playToggle: HotkeyCallback = () => {
  const playback = usePlaybackStore();
  void startPlayback({
    client: generatedClient,
    body: { showVersion: playback.state.showVersion },
  });
};

const cueNext: HotkeyCallback = () => seekRelative(1);
const cuePrev: HotkeyCallback = () => seekRelative(-1);

const resetPlaybackCommand: HotkeyCallback = () => {
  const playback = usePlaybackStore();
  void resetPlayback({
    client: generatedClient,
    body: { showVersion: playback.state.showVersion },
  });
};

/** Scroll the timeline viewport to its top/bottom (degrades to the page). */
function scrollTimelineTo(edge: "top" | "bottom"): void {
  const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-timeline-row]"));
  const target = edge === "top" ? rows[0] : rows[rows.length - 1];
  if (!target) return;
  const container = target.parentElement?.parentElement;
  if (!container) return;
  animateScrollIntoView(target, container, {
    block: edge === "top" ? "start" : "end",
    duration: 0.3,
  });
}

const timelineJumpTop: HotkeyCallback = () => scrollTimelineTo("top");
const timelineJumpBottom: HotkeyCallback = () => scrollTimelineTo("bottom");

/* ------------------------------------------------------------------ */
/* Control: main panel tab switching                                   */
/* ------------------------------------------------------------------ */

const controlEditMainPanelStore = () => useControlEditMainPanelStore();

const controlTabPreview: HotkeyCallback = () =>
  controlEditMainPanelStore().setActiveTab(ControlEditMainPanelTab.Preview);
const controlTabAssets: HotkeyCallback = () =>
  controlEditMainPanelStore().setActiveTab(ControlEditMainPanelTab.Assets);
const controlTabCue: HotkeyCallback = () =>
  controlEditMainPanelStore().setActiveTab(ControlEditMainPanelTab.Cue);
const controlTabInfo: HotkeyCallback = () =>
  controlEditMainPanelStore().setActiveTab(ControlEditMainPanelTab.Info);
const controlTabSettings: HotkeyCallback = () =>
  controlEditMainPanelStore().setActiveTab(ControlEditMainPanelTab.Settings);

/* ------------------------------------------------------------------ */
/* Control: transport prev/next                                        */
/* ------------------------------------------------------------------ */

function transportSeek(delta: 1 | -1): void {
  const rows = useControlShowRows().value;
  if (rows.length === 0) return;
  const playback = usePlaybackStore();
  const currentId = playback.currentEventId;
  const idx = currentId != null ? rows.findIndex((row) => row.id === currentId) : -1;
  const target = rows[idx + delta];
  if (!target) return;
  // Mirror the mouse transport buttons: only seek once the show is playing or
  // paused, never on an idle show.
  if (!isSeekable()) return;
  void seekPlayback({
    client: generatedClient,
    body: { showVersion: playback.state.showVersion, eventId: target.id },
  });
}

const transportPrev: HotkeyCallback = () => transportSeek(-1);
const transportNext: HotkeyCallback = () => transportSeek(1);

/* ------------------------------------------------------------------ */
/* Assets manager                                                      */
/* ------------------------------------------------------------------ */

const assetsManagerStore = () => useAssetsManagerStore();
const assetsInteractionStore = () => useAssetsInteractionStore();
const confirmActionStore = () => useConfirmActionStore();

/** Selected entry ids for the currently focused panel. */
function assetsSelectedIds(store: ReturnType<typeof useAssetsManagerStore>): Set<string> {
  return store.focusedPanel === "tree"
    ? store.selectedEntryId
      ? new Set([store.selectedEntryId])
      : new Set<string>()
    : store.selectedIds;
}

function assetsHandleError(e: unknown, label: string): void {
  const msg = parseErrorMessage(e);
  console.error(`${label} error:`, e);
  toaster.create({ title: label, description: msg, type: "error" });
}

const assetsDelete: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  const store = assetsManagerStore();
  const ids = assetsSelectedIds(store);
  if (ids.size === 0) return;
  for (const id of ids) {
    const entry = store.findEntry(id);
    if (!entry) continue;
    confirmActionStore()
      .confirmAction({
        title: entry.isDirectory ? "Delete Folder" : "Delete File",
        message: entry.isDirectory
          ? `Delete ${ids.size > 1 ? `${ids.size} folders` : "this folder"} and its contents?`
          : `Delete ${ids.size > 1 ? `${ids.size} files` : `"${entry.name}"`}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      })
      .then((accepted) => {
        if (accepted) {
          store.deleteEntry(id, entry.isDirectory).catch((e) => assetsHandleError(e, "Delete"));
        }
      });
  }
};

const assetsRename: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  const store = assetsManagerStore();
  const ids = assetsSelectedIds(store);
  if (ids.size !== 1) return;
  const id = [...ids][0];
  if (!id) return;
  const entry = store.findEntry(id);
  if (!entry) return;
  confirmActionStore()
    .promptAction({
      title: entry.isDirectory ? "Rename Folder" : "Rename File",
      label: "New name",
      defaultValue: entry.name,
      confirmLabel: "Rename",
    })
    .then((name) => {
      if (name?.trim()) {
        store
          .renameEntry(id, entry.isDirectory, name.trim())
          .catch((e) => assetsHandleError(e, "Rename"));
      }
    });
};

const assetsUpload: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  assetsManagerStore().openFilePicker();
};

const assetsCopy: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  assetsInteractionStore().copySelection();
};

const assetsCut: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  assetsInteractionStore().cutSelection();
};

const assetsPaste: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  const store = assetsManagerStore();
  const targetFolderId = store.selectedEntryId;
  assetsInteractionStore()
    .pasteInto(targetFolderId ?? null)
    .catch((e) => assetsHandleError(e, "Paste"));
};

const assetsCreateFolder: HotkeyCallback = () => {
  if (isEditableTargetFocused()) return;
  const store = assetsManagerStore();
  const folderId = store.selectedEntryId;
  confirmActionStore()
    .promptAction({
      title: folderId ? "Create Subfolder" : "Create Folder",
      label: "Folder name",
      confirmLabel: "Create",
    })
    .then((name) => {
      if (name?.trim()) {
        store
          .createFolder(folderId ?? null, name.trim())
          .catch((e) => assetsHandleError(e, "Create Folder"));
      }
    });
};

/**
 * The canonical command registry. Each command declares its *default* binding,
 * but the live binding is owned by the shortcuts store so users can rebind it.
 * Add new commands here; the registration composable and overlay pick them up
 * automatically.
 */
export const commands: readonly CommandDefinition[] = [
  {
    id: "open-shortcuts",
    title: "Keyboard shortcuts",
    description: "Show every shortcut (this panel)",
    scope: CommandScope.Global,
    category: "General",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: { key: "/", shift: true } },
    handler: openShortcutsCommand,
  },
  {
    id: "toggle-color-mode",
    title: "Toggle color mode",
    description: "Switch between light and dark",
    scope: CommandScope.Global,
    category: "View",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+J" },
    handler: toggleColorMode,
  },
  {
    id: "toggle-fullscreen",
    title: "Toggle fullscreen",
    description: "Enter or exit fullscreen",
    scope: CommandScope.Global,
    category: "View",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+Shift+F" },
    handler: toggleFullscreen,
  },
  {
    id: "play-toggle",
    title: "Play / Pause",
    description: "Start or resume the show",
    scope: CommandScope.Control,
    category: "Playback",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+Enter" },
    handler: playToggle,
  },
  {
    id: "cue-next",
    title: "Next cue",
    description: "Seek to the next cue",
    scope: CommandScope.Control,
    category: "Playback",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+]" },
    handler: cueNext,
  },
  {
    id: "cue-prev",
    title: "Previous cue",
    description: "Seek to the previous cue",
    scope: CommandScope.Control,
    category: "Playback",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+[" },
    handler: cuePrev,
  },
  {
    id: "reset-playback",
    title: "Jump to start",
    description: "Reset playback to the first cue",
    scope: CommandScope.Control,
    category: "Playback",
    // This should've been Mod+0 or Mod+Home or something like that. But when being displayed in the shortcut viewer,
    // which uses sans-serif font, the number 0 is non distinguisable from capitalized letter O.
    // And Home isn't available on macOS by default.
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+Shift+A" },
    handler: resetPlaybackCommand,
  },
  {
    id: "timeline-jump-top",
    title: "Timeline: jump to top",
    description: "Scroll the timeline to the first cue",
    scope: CommandScope.Control,
    category: "Timeline",
    defaultBinding: { kind: CommandBindingKind.Sequence, sequence: ["G", "G"] },
    handler: timelineJumpTop,
  },
  {
    id: "timeline-jump-bottom",
    title: "Timeline: jump to bottom",
    description: "Scroll the timeline to the last cue",
    scope: CommandScope.Control,
    category: "Timeline",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Shift+G" },
    handler: timelineJumpBottom,
  },
  {
    id: "control-tab-preview",
    title: "Tab: Preview",
    description: "Switch the main panel to the Preview tab",
    scope: CommandScope.Control,
    category: "Tabs",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+1" },
    handler: controlTabPreview,
  },
  {
    id: "control-tab-assets",
    title: "Tab: Assets",
    description: "Switch the main panel to the Assets tab",
    scope: CommandScope.Control,
    category: "Tabs",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+2" },
    handler: controlTabAssets,
  },
  {
    id: "control-tab-cue",
    title: "Tab: Cue",
    description: "Switch the main panel to the Cue tab",
    scope: CommandScope.Control,
    category: "Tabs",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+3" },
    handler: controlTabCue,
  },
  {
    id: "control-tab-info",
    title: "Tab: Info",
    description: "Switch the main panel to the Info tab",
    scope: CommandScope.Control,
    category: "Tabs",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+4" },
    handler: controlTabInfo,
  },
  {
    id: "control-tab-settings",
    title: "Tab: Settings",
    description: "Switch the main panel to the Settings tab",
    scope: CommandScope.Control,
    category: "Tabs",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+5" },
    handler: controlTabSettings,
  },
  {
    id: "transport-prev",
    title: "Previous event",
    description: "Seek to the previous cue",
    scope: CommandScope.Control,
    category: "Playback",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "ArrowLeft" },
    handler: transportPrev,
  },
  {
    id: "transport-next",
    title: "Next event",
    description: "Seek to the next cue",
    scope: CommandScope.Control,
    category: "Playback",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "ArrowRight" },
    handler: transportNext,
  },
  {
    id: "assets-delete",
    title: "Delete entry",
    description: "Delete the selected file or folder",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Backspace" },
    handler: assetsDelete,
  },
  {
    id: "assets-rename",
    title: "Rename entry",
    description: "Rename the selected file or folder",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "F2" },
    handler: assetsRename,
  },
  {
    id: "assets-upload",
    title: "Upload file",
    description: "Open the file picker to upload into the selected folder",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+I" },
    handler: assetsUpload,
  },
  {
    id: "assets-copy",
    title: "Copy selection",
    description: "Copy the selected entries",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+C" },
    handler: assetsCopy,
  },
  {
    id: "assets-cut",
    title: "Cut selection",
    description: "Cut the selected entries",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+X" },
    handler: assetsCut,
  },
  {
    id: "assets-paste",
    title: "Paste selection",
    description: "Paste into the selected folder",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+V" },
    handler: assetsPaste,
  },
  {
    id: "assets-create-folder",
    title: "Create folder",
    description: "Create a folder (or subfolder of the selection)",
    scope: CommandScope.Assets,
    category: "Assets",
    defaultBinding: { kind: CommandBindingKind.Sequence, sequence: ["Mod+K", "Mod+F"] },
    handler: assetsCreateFolder,
  },
];

export const commandsById: Record<CommandId, CommandDefinition> = Object.fromEntries(
  commands.map((command) => [command.id, command]),
) as Record<CommandId, CommandDefinition>;

export type { CommandId } from "./types";
