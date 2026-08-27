import type { HotkeyCallback } from "@tanstack/vue-hotkeys";
import {
  generatedClient,
  resetPlayback,
  seekPlayback,
  startPlayback,
} from "@tgb-resolver/contracts";

import { usePlaybackStore } from "@/features/control/playback-store";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { useColorModeStore } from "@/stores/color-mode-store";
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

function seekRelative(delta: 1 | -1): void {
  const showStore = useShowStore();
  const playback = usePlaybackStore();
  const rows = showStore.rows;
  if (rows.length === 0) return;
  const currentId = playback.currentEventId;
  const idx = currentId != null ? rows.findIndex((row) => row.id === currentId) : -1;
  const target = rows[idx + delta];
  if (!target) return;
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
    defaultBinding: { kind: CommandBindingKind.Hotkey, hotkey: "Mod+K" },
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
];

export const commandsById: Record<CommandId, CommandDefinition> = Object.fromEntries(
  commands.map((command) => [command.id, command]),
) as Record<CommandId, CommandDefinition>;

export type { CommandId } from "./types";
