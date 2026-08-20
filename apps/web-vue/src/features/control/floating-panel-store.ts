import { defineStore } from "pinia";
import { v7 as uuidv7 } from "uuid";
import { computed, type Ref, ref, shallowRef } from "vue";

import { useConfirmActionStore } from "@/stores/confirm-action-store";

import type { FloatingPanelType } from "./floating-panel-types";

export interface FloatingPanelHandle {
  readonly id: string;
  readonly type: FloatingPanelType;
  readonly title: Ref<string>;
  readonly props: Ref<Record<string, unknown>>;
  readonly result: Promise<boolean>;
  isDirty: Ref<boolean>;
  isSaving: Ref<boolean>;
  setTitle(title: string): void;
  setDirty(dirty: boolean): void;
  setSaving(saving: boolean): void;
  requestClose(reason?: "close" | "replace"): Promise<boolean>;
  close(accepted: boolean): void;
}

export const useFloatingPanelStore = defineStore("floating-panel", () => {
  const panels = shallowRef<FloatingPanelHandle[]>([]);
  const hasDirtyPanels = computed(() => panels.value.some((panel) => panel.isDirty.value));
  let confirmQueue: Promise<boolean> = Promise.resolve(false);

  function createHandle(
    type: FloatingPanelType,
    title: string,
    props: Record<string, unknown>,
  ): FloatingPanelHandle {
    const id = uuidv7();
    const titleRef = ref(title);
    const propsRef = ref(props);
    const isDirty = ref(false);
    const isSaving = ref(false);
    let resolveResult: ((accepted: boolean) => void) | null = null;
    const result = new Promise<boolean>((resolve) => {
      resolveResult = resolve;
    });

    const handle: FloatingPanelHandle = {
      id,
      type,
      title: titleRef,
      props: propsRef,
      result,
      isDirty,
      isSaving,
      setTitle(value) {
        titleRef.value = value;
      },
      setDirty(dirty) {
        isDirty.value = dirty;
      },
      setSaving(saving) {
        isSaving.value = saving;
      },
      async requestClose(reason = "close") {
        if (isDirty.value) {
          const confirm = confirmQueue.then(() =>
            useConfirmActionStore().confirmAction({
              title: "Discard changes?",
              message:
                reason === "replace"
                  ? "Discard this panel and open another one?"
                  : "Discard this panel?",
              confirmLabel: "Discard",
            }),
          );
          confirmQueue = confirm.catch(() => false);
          const accepted = await confirm;
          if (!accepted) return false;
        }

        handle.close(false);
        return true;
      },
      close(accepted) {
        resolveResult?.(accepted);
        panels.value = panels.value.filter((panel) => panel.id !== id);
      },
    };

    return handle;
  }

  function openFloatingPanel(
    type: FloatingPanelType,
    title: string,
    props: Record<string, unknown> = {},
  ): FloatingPanelHandle {
    const handle = createHandle(type, title, props);
    panels.value = [...panels.value, handle];
    return handle;
  }

  function requestFloatingPanelClose(
    handle: FloatingPanelHandle,
    reason: "close" | "replace" = "close",
  ) {
    return handle.requestClose(reason);
  }

  function closeFloatingPanel(handle: FloatingPanelHandle, accepted: boolean) {
    handle.close(accepted);
  }

  return {
    panels,
    hasDirtyPanels,
    openFloatingPanel,
    requestFloatingPanelClose,
    closeFloatingPanel,
  };
});
