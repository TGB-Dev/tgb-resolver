import { create } from "zustand";

import { useConfirmActionStore } from "./control-confirm-action";
import type { FloatingPanelType } from "./floating-panel-types";

interface FloatingPanelRequest {
  type: FloatingPanelType;
  title: string;
  props: Record<string, unknown>;
  resolve: (accepted: boolean) => void;
}

interface FloatingPanelStore {
  active: FloatingPanelRequest | null;
  isDirty: boolean;
  openFloatingPanel: (
    type: FloatingPanelType,
    title: string,
    props?: Record<string, unknown>,
  ) => Promise<boolean>;
  closeFloatingPanel: (accepted: boolean) => void;
  requestFloatingPanelClose: (reason?: "close" | "replace") => Promise<boolean>;
  setDirty: (isDirty: boolean) => void;
}

export const useFloatingPanelStore = create<FloatingPanelStore>((set, get) => ({
  active: null,
  isDirty: false,

  setDirty: (isDirty) => set({ isDirty }),

  openFloatingPanel: async (type, title, props = {}) => {
    if (!(await get().requestFloatingPanelClose("replace"))) {
      return false;
    }

    return new Promise((resolve) => {
      set({ active: { type, title, props, resolve }, isDirty: false });
    });
  },

  requestFloatingPanelClose: async (reason = "close") => {
    const { active, isDirty } = get();
    if (!active) return true;

    if (isDirty) {
      const accepted = await useConfirmActionStore.getState().confirmAction({
        title: "Discard changes?",
        message:
          reason === "replace" ? "Discard this panel and open another one?" : "Discard this panel?",
        confirmLabel: "Discard",
      });
      if (!accepted) return false;
    }

    get().closeFloatingPanel(false);
    return true;
  },

  closeFloatingPanel: (accepted) => {
    get().active?.resolve(accepted);
    set({ active: null, isDirty: false });
  },
}));
