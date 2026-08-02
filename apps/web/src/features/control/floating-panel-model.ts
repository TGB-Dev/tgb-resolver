import { batch, computed, createModel, type ReadonlySignal, signal } from "@preact/signals-react";
import { v7 as uuidv7 } from "uuid";

import { confirmActionModel } from "../shared/confirm-action-model";
import type { FloatingPanelType } from "./floating-panel-types";

export interface FloatingPanelHandle {
  readonly id: string;
  readonly type: FloatingPanelType;
  readonly title: ReadonlySignal<string>;
  readonly props: ReadonlySignal<Record<string, unknown>>;
  readonly result: Promise<boolean>;
  isDirty: ReadonlySignal<boolean>;
  isSaving: ReadonlySignal<boolean>;
  setTitle(title: string): void;
  setDirty(dirty: boolean): void;
  setSaving(saving: boolean): void;
  requestClose(reason?: "close" | "replace"): Promise<boolean>;
  close(accepted: boolean): void;
}

interface FloatingPanelModel {
  panels: ReadonlySignal<FloatingPanelHandle[]>;
  hasDirtyPanels: ReadonlySignal<boolean>;
  openFloatingPanel(
    type: FloatingPanelType,
    title: string,
    props?: Record<string, unknown>,
  ): FloatingPanelHandle;
  requestFloatingPanelClose(
    handle: FloatingPanelHandle,
    reason?: "close" | "replace",
  ): Promise<boolean>;
  closeFloatingPanel(handle: FloatingPanelHandle, accepted: boolean): void;
}

const FloatingPanelModel = createModel<FloatingPanelModel>(() => {
  const panels = signal<FloatingPanelHandle[]>([]);
  const hasDirtyPanels = computed(() => panels.value.some((panel) => panel.isDirty.value));
  let confirmQueue: Promise<boolean> = Promise.resolve(false);

  function createHandle(
    type: FloatingPanelType,
    title: string,
    props: Record<string, unknown>,
  ): FloatingPanelHandle {
    const id = uuidv7();
    const titleSignal = signal(title);
    const propsSignal = signal(props);
    const isDirty = signal(false);
    const isSaving = signal(false);
    let resolveResult: ((accepted: boolean) => void) | null = null;
    const result = new Promise<boolean>((resolve) => {
      resolveResult = resolve;
    });

    const handle: FloatingPanelHandle = {
      id,
      type,
      title: titleSignal,
      props: propsSignal,
      result,
      isDirty,
      isSaving,
      setTitle(value) {
        titleSignal.value = value;
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
            confirmActionModel.confirmAction({
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
        batch(() => {
          panels.value = panels.value.filter((panel) => panel.id !== id);
        });
      },
    };

    return handle;
  }

  return {
    panels,
    hasDirtyPanels,
    openFloatingPanel(type, title, props = {}) {
      const handle = createHandle(type, title, props);
      batch(() => {
        panels.value = [...panels.value, handle];
      });
      return handle;
    },
    requestFloatingPanelClose(handle, reason = "close") {
      return handle.requestClose(reason);
    },
    closeFloatingPanel(handle, accepted) {
      handle.close(accepted);
    },
  };
});

export const floatingPanelModel = new FloatingPanelModel();
