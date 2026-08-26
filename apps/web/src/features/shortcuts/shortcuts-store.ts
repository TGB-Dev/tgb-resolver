import {
  type HotkeySequence,
  normalizeRegisterableHotkey,
  type RegisterableHotkey,
} from "@tanstack/vue-hotkeys";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { type CommandId, commands, commandsById } from "./commands";
import { type CommandBinding, CommandBindingKind } from "./types";

const STORAGE_KEY = "tgb-shortcuts-bindings";

function buildDefaultBindings(): Record<CommandId, CommandBinding> {
  const map = {} as Record<CommandId, CommandBinding>;
  for (const command of commands) {
    map[command.id] = command.defaultBinding;
  }
  return map;
}

function loadBindings(): Record<CommandId, CommandBinding> {
  const defaults = buildDefaultBindings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const command of commands) {
      const saved = parsed[command.id] as CommandBinding | undefined;
      if (
        saved &&
        (saved.kind === CommandBindingKind.Hotkey ||
          saved.kind === CommandBindingKind.Sequence ||
          saved.kind === CommandBindingKind.None)
      ) {
        defaults[command.id] = saved;
      }
    }
  } catch {
    // Corrupt storage — fall back to defaults.
  }
  return defaults;
}

/** A stable string for a binding, used to detect duplicates. */
function bindingSignature(binding: CommandBinding): string | null {
  if (binding.kind === CommandBindingKind.None) return null;
  if (binding.kind === CommandBindingKind.Hotkey)
    return normalizeRegisterableHotkey(binding.hotkey);
  return binding.sequence.map((step) => normalizeRegisterableHotkey(step)).join(" ");
}

export const useShortcutsStore = defineStore("shortcuts", () => {
  const bindings = ref<Record<CommandId, CommandBinding>>(loadBindings());
  const overlayOpen = ref(false);

  const isBound = (id: CommandId): boolean => bindings.value[id].kind !== CommandBindingKind.None;

  const isCustomized = (id: CommandId): boolean =>
    JSON.stringify(bindings.value[id]) !== JSON.stringify(commandsById[id].defaultBinding);

  function getBinding(id: CommandId): CommandBinding {
    return bindings.value[id];
  }

  /** Current hotkey, or the default when unassigned (keeps the registration valid). */
  function getHotkey(id: CommandId): RegisterableHotkey {
    const binding = bindings.value[id];
    if (binding.kind === CommandBindingKind.Hotkey) return binding.hotkey;
    const fallback = commandsById[id].defaultBinding;
    return fallback.kind === CommandBindingKind.Hotkey ? fallback.hotkey : "Escape";
  }

  /** Current sequence, or the default when unassigned. */
  function getSequence(id: CommandId): HotkeySequence {
    const binding = bindings.value[id];
    if (binding.kind === CommandBindingKind.Sequence) return binding.sequence;
    const fallback = commandsById[id].defaultBinding;
    return fallback.kind === CommandBindingKind.Sequence ? fallback.sequence : ["Escape"];
  }

  function setBinding(id: CommandId, binding: CommandBinding): void {
    bindings.value = { ...bindings.value, [id]: binding };
  }

  function resetBinding(id: CommandId): void {
    bindings.value = { ...bindings.value, [id]: commandsById[id].defaultBinding };
  }

  function resetAll(): void {
    bindings.value = buildDefaultBindings();
  }

  /** Ids of other commands sharing the same live binding (excluding `id`). */
  function conflictsFor(id: CommandId): CommandId[] {
    const signature = bindingSignature(bindings.value[id]);
    if (!signature) return [];
    return commands
      .filter(
        (command) =>
          command.id !== id && bindingSignature(bindings.value[command.id]) === signature,
      )
      .map((command) => command.id);
  }

  const hasAnyConflict = computed(() =>
    commands.some((command) => conflictsFor(command.id).length > 0),
  );

  function openOverlay(): void {
    overlayOpen.value = true;
  }

  function closeOverlay(): void {
    overlayOpen.value = false;
  }

  function toggleOverlay(): void {
    overlayOpen.value = !overlayOpen.value;
  }

  watch(
    bindings,
    (value) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // Ignore quota / private-mode errors.
      }
    },
    { deep: true },
  );

  return {
    bindings,
    overlayOpen,
    isBound,
    isCustomized,
    getBinding,
    getHotkey,
    getSequence,
    setBinding,
    resetBinding,
    resetAll,
    conflictsFor,
    hasAnyConflict,
    openOverlay,
    closeOverlay,
    toggleOverlay,
  };
});
