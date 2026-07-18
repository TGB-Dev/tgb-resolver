import { batch, createModel, type ReadonlySignal, signal } from "@preact/signals-react";

interface ConfirmActionPayload {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmActionModel {
  open: ReadonlySignal<boolean>;
  title: ReadonlySignal<string>;
  message: ReadonlySignal<string>;
  confirmLabel: ReadonlySignal<string>;
  cancelLabel: ReadonlySignal<string>;
  confirmAction: (payload: ConfirmActionPayload) => Promise<boolean>;
  resolveConfirmAction: (ok: boolean) => void;
}

const ConfirmActionModel = createModel<ConfirmActionModel>(() => {
  const open = signal(false);
  const title = signal("");
  const message = signal("");
  const confirmLabel = signal("Confirm");
  const cancelLabel = signal("Cancel");
  let resolve: ((value: boolean) => void) | null = null;

  return {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,

    confirmAction(payload) {
      return new Promise<boolean>((res) => {
        batch(() => {
          open.value = true;
          title.value = payload.title;
          message.value = payload.message;
          confirmLabel.value = payload.confirmLabel ?? "Confirm";
          cancelLabel.value = payload.cancelLabel ?? "Cancel";
        });
        resolve = res;
      });
    },

    resolveConfirmAction(ok: boolean) {
      resolve?.(ok);
      resolve = null;
      batch(() => {
        open.value = false;
        title.value = "";
        message.value = "";
        confirmLabel.value = "Confirm";
        cancelLabel.value = "Cancel";
      });
    },
  };
});

export const confirmActionModel = new ConfirmActionModel();
