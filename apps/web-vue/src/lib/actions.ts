import type { RegisterableHotkey } from "@tanstack/vue-hotkeys";
import { useHotkey } from "@tanstack/vue-hotkeys";
import { type ComputedRef, computed, type Ref, ref, toRef } from "vue";

export interface UseActionOptions {
  handler: () => void;
  enabled: boolean | Ref<boolean> | (() => boolean);
  hotkeys?: RegisterableHotkey[];
}

export interface Action {
  readonly execute: () => void;
  readonly enabled: ComputedRef<boolean>;
  readonly buttonProps: ComputedRef<{
    readonly onClick: () => void;
    readonly disabled: boolean;
  }>;
}

export function useAction({ handler, enabled, hotkeys = [] }: UseActionOptions): Action {
  const handlerRef = ref(handler);
  handlerRef.value = handler;
  const enabledRef = toRef(enabled);

  const effectiveEnabled = computed(() => enabledRef.value);

  const execute = () => {
    if (effectiveEnabled.value) {
      handlerRef.value();
    }
  };

  for (const hotkey of hotkeys) {
    useHotkey(hotkey, execute, { enabled: effectiveEnabled });
  }

  const buttonProps = computed(() => ({ onClick: execute, disabled: !effectiveEnabled.value }));

  return {
    execute,
    enabled: effectiveEnabled,
    buttonProps,
  };
}
