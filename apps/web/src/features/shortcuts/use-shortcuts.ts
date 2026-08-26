import { useHotkey, useHotkeySequence } from "@tanstack/vue-hotkeys";

import { commands } from "./commands";
import { useShortcutsStore } from "./shortcuts-store";
import { CommandBindingKind, type CommandDefinition } from "./types";

/**
 * Registers every command's current binding with the singleton HotkeyManager.
 *
 * The binding (key) and the `enabled` flag are passed as getters, so the
 * manager re-registers a command automatically when the user rebinds it or
 * when the overlay opens. Commands stay decoupled from their bindings — the
 * store owns the key. All commands are always active (the scope field on a
 * command is metadata only); the only functional gate is the overlay being
 * closed so shortcuts don't fire while the user is rebinding.
 */
export function useShortcutsRegistration(): void {
  const store = useShortcutsStore();

  for (const command of commands) {
    const isSequence = command.defaultBinding.kind === CommandBindingKind.Sequence;

    const options = () => ({
      enabled: store.isBound(command.id) && !store.overlayOpen,
      conflictBehavior: (command as CommandDefinition).conflictBehavior ?? "warn",
      preventDefault: true,
      stopPropagation: true,
      meta: { name: command.title, description: command.description },
    });

    if (isSequence) {
      useHotkeySequence(() => store.getSequence(command.id), command.handler, options);
    } else {
      useHotkey(() => store.getHotkey(command.id), command.handler, options);
    }
  }
}
