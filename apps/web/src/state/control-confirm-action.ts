import { atom } from "jotai";

import { appStore } from "./control";

export interface ConfirmActionPayload {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmActionState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: ((value: boolean) => void) | null;
}

const initialState: ConfirmActionState = {
  open: false,
  title: "",
  message: "",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  resolve: null,
};

export const confirmActionStateAtom = atom<ConfirmActionState>(initialState);

export const resetConfirmActionAtom = atom(null, (_get, set) => {
  set(confirmActionStateAtom, initialState);
});

export function confirmAction(payload: ConfirmActionPayload): Promise<boolean> {
  return new Promise((resolve) => {
    appStore.set(confirmActionStateAtom, {
      open: true,
      title: payload.title,
      message: payload.message,
      confirmLabel: payload.confirmLabel ?? "Confirm",
      cancelLabel: payload.cancelLabel ?? "Cancel",
      resolve,
    });
  });
}

export function resolveConfirmAction(ok: boolean) {
  const state = appStore.get(confirmActionStateAtom);
  state.resolve?.(ok);
  appStore.set(confirmActionStateAtom, initialState);
}
