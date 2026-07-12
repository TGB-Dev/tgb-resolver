import { atom } from "jotai";
import type { ReactNode } from "react";

import { appStore } from "./control";
import { confirmAction } from "./control-confirm-action";

export enum FloatingPanelType {
  ImportShow = "import-show",
}

export interface FloatingPanelRequest {
  type: FloatingPanelType;
  title: string;
  content: ReactNode;
  resolve: (accepted: boolean) => void;
}

const activeFloatingPanelAtom = atom<FloatingPanelRequest | null>(null);
const floatingPanelDirtyAtom = atom(false);

export const floatingPanelStateAtom = atom((get) => ({
  active: get(activeFloatingPanelAtom),
  isDirty: get(floatingPanelDirtyAtom),
}));

export const setFloatingPanelDirtyAtom = atom(null, (_get, set, isDirty: boolean) => {
  set(floatingPanelDirtyAtom, isDirty);
});

export async function openFloatingPanel(
  type: FloatingPanelType,
  title: string,
  content: ReactNode,
): Promise<boolean> {
  if (!(await requestFloatingPanelClose("replace"))) {
    return false;
  }

  return new Promise((resolve) => {
    appStore.set(activeFloatingPanelAtom, { type, title, content, resolve });
    appStore.set(floatingPanelDirtyAtom, false);
  });
}

export async function requestFloatingPanelClose(
  reason: "close" | "replace" = "close",
): Promise<boolean> {
  const active = appStore.get(activeFloatingPanelAtom);
  if (!active) {
    return true;
  }

  if (appStore.get(floatingPanelDirtyAtom)) {
    const accepted = await confirmAction({
      title: "Discard changes?",
      message:
        reason === "replace" ? "Discard this panel and open another one?" : "Discard this panel?",
      confirmLabel: "Discard",
    });
    if (!accepted) {
      return false;
    }
  }

  closeFloatingPanel(false);
  return true;
}

export function closeFloatingPanel(accepted: boolean) {
  const active = appStore.get(activeFloatingPanelAtom);
  active?.resolve(accepted);
  appStore.set(activeFloatingPanelAtom, null);
  appStore.set(floatingPanelDirtyAtom, false);
}
