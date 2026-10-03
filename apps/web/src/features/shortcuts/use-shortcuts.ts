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
 * command is metadata only); the functional gates are the overlay and the
 * command palette being closed so shortcuts don't fire while the user is
 * rebinding or picking a command. The palette toggle stays live while the
 * palette is open so it can close it.
 */
export function useShortcutsRegistration(): void {
  const store = useShortcutsStore();

  for (const command of commands) {
    const isSequence = command.defaultBinding.kind === CommandBindingKind.Sequence;
    const isPaletteToggle = command.id === "open-command-palette";

    const options = () => ({
      enabled:
        store.isBound(command.id) &&
        !store.overlayOpen &&
        (!store.paletteOpen || isPaletteToggle) &&
        store.isScopeActive(command.scope),
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
