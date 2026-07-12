import { create } from "zustand";

interface ConfirmActionPayload {
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

interface ConfirmActionStore extends ConfirmActionState {
  confirmAction: (payload: ConfirmActionPayload) => Promise<boolean>;
  resolveConfirmAction: (ok: boolean) => void;
}

export const useConfirmActionStore = create<ConfirmActionStore>((set, get) => ({
  ...initialState,

  confirmAction: (payload) =>
    new Promise((resolve) => {
      set({
        open: true,
        title: payload.title,
        message: payload.message,
        confirmLabel: payload.confirmLabel ?? "Confirm",
        cancelLabel: payload.cancelLabel ?? "Cancel",
        resolve,
      });
    }),

  resolveConfirmAction: (ok: boolean) => {
    get().resolve?.(ok);
    set(initialState);
  },
}));
