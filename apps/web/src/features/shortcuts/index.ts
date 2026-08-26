export { type CommandId, commands, commandsById } from "./commands";
export {
  detectCurrentPlatform,
  formatBinding,
  formatHotkeyDisplay,
  formatSequenceDisplay,
  PLATFORM_LABELS,
  type Platform,
} from "./display";
export { default as KbdFromHotkeys } from "./kbd-from-hotkeys.vue";
export { useShortcutsStore } from "./shortcuts-store";
export type { CommandBinding, CommandDefinition } from "./types";
export { CommandBindingKind, CommandScope } from "./types";
export {
  useHeldKeys,
  useKeyHold,
  useModifierState,
} from "./use-shortcut-keys";
export { useSequenceRecorder, useSingleRecorder } from "./use-shortcut-recorder";
export { useShortcutsRegistration } from "./use-shortcuts";
