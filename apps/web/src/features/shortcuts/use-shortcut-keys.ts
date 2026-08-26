import { useHeldKeys, useKeyHold } from "@tanstack/vue-hotkeys";
import { computed, type Ref } from "vue";

export { useHeldKeys, useKeyHold };

/**
 * Reactive state of the primary modifier keys. Useful for showing live chord
 * hints in the UI while a key is held.
 */
export function useModifierState(): {
  shift: Ref<boolean>;
  alt: Ref<boolean>;
  ctrl: Ref<boolean>;
  meta: Ref<boolean>;
  mod: Ref<boolean>;
} {
  const shift = useKeyHold("Shift");
  const alt = useKeyHold("Alt");
  const ctrl = useKeyHold("Control");
  const meta = useKeyHold("Meta");
  const mod = computed(() => meta.value || ctrl.value);
  return { shift, alt, ctrl, meta, mod };
}
