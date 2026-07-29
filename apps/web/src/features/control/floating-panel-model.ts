import { batch, createModel, type ReadonlySignal, signal } from "@preact/signals-react";

import { confirmActionModel } from "../shared/confirm-action-model";
import type { FloatingPanelType } from "./floating-panel-types";

interface FloatingPanelRequest {
  type: FloatingPanelType;
  title: string;
  props: Record<string, unknown>;
  resolve: (accepted: boolean) => void;
}

interface FloatingPanelModel {
  active: ReadonlySignal<FloatingPanelRequest | null>;
  isDirty: ReadonlySignal<boolean>;
  openFloatingPanel: (
    type: FloatingPanelType,
    title: string,
    props?: Record<string, unknown>,
  ) => Promise<boolean>;
  closeFloatingPanel: (accepted: boolean) => void;
  requestFloatingPanelClose: (reason?: "close" | "replace") => Promise<boolean>;
  setDirty: (isDirty: boolean) => void;
}

const FloatingPanelModel = createModel<FloatingPanelModel>(() => {
  const active = signal<FloatingPanelRequest | null>(null);
  const isDirty = signal(false);

  return {
    active,
    isDirty,

    setDirty(dirty: boolean) {
      isDirty.value = dirty;
    },

    async openFloatingPanel(type, title, props = {}) {
      if (!(await requestFloatingPanelCloseInner("replace"))) {
        return false;
      }

      return new Promise((resolve) => {
        batch(() => {
          active.value = { type, title, props, resolve };
          isDirty.value = false;
        });
      });
    },

    async requestFloatingPanelClose(reason = "close") {
      return requestFloatingPanelCloseInner(reason);
    },

    closeFloatingPanel(accepted: boolean) {
      active.value?.resolve(accepted);
      batch(() => {
        active.value = null;
        isDirty.value = false;
      });
    },
  };

  async function requestFloatingPanelCloseInner(reason: "close" | "replace") {
    const current = active.value;
    if (!current) return true;

    if (isDirty.value) {
      const accepted = await confirmActionModel.confirmAction({
        title: "Discard changes?",
        message:
          reason === "replace" ? "Discard this panel and open another one?" : "Discard this panel?",
        confirmLabel: "Discard",
      });
      if (!accepted) return false;
    }

    closeFloatingPanelInner(false);
    return true;
  }

  function closeFloatingPanelInner(accepted: boolean) {
    active.value?.resolve(accepted);
    batch(() => {
      active.value = null;
      isDirty.value = false;
    });
  }
});

export const floatingPanelModel = new FloatingPanelModel();
