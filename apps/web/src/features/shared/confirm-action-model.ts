import { batch, createModel, type ReadonlySignal, signal } from "@preact/signals-react";

interface ConfirmActionPayload {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PromptActionPayload {
  title: string;
  label: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface ConfirmActionModel {
  open: ReadonlySignal<boolean>;
  title: ReadonlySignal<string>;
  message: ReadonlySignal<string>;
  confirmLabel: ReadonlySignal<string>;
  cancelLabel: ReadonlySignal<string>;
  showInput: ReadonlySignal<boolean>;
  inputLabel: ReadonlySignal<string>;
  inputValue: ReadonlySignal<string>;
  setInputValue: (value: string) => void;
  confirmAction: (payload: ConfirmActionPayload) => Promise<boolean>;
  promptAction: (payload: PromptActionPayload) => Promise<string | null>;
  resolveConfirmAction: (ok: boolean) => void;
}

const ConfirmActionModel = createModel<ConfirmActionModel>(() => {
  const open = signal(false);
  const title = signal("");
  const message = signal("");
  const confirmLabel = signal("Confirm");
  const cancelLabel = signal("Cancel");
  const showInput = signal(false);
  const inputLabel = signal("");
  const inputValue = signal("");
  let resolveConfirm: ((value: boolean) => void) | null = null;
  let resolvePrompt: ((value: string | null) => void) | null = null;

  return {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    showInput,
    inputLabel,
    inputValue,

    setInputValue(value: string) {
      inputValue.value = value;
    },

    confirmAction(payload) {
      return new Promise<boolean>((res) => {
        batch(() => {
          open.value = true;
          title.value = payload.title;
          message.value = payload.message;
          confirmLabel.value = payload.confirmLabel ?? "Confirm";
          cancelLabel.value = payload.cancelLabel ?? "Cancel";
          showInput.value = false;
          inputValue.value = "";
        });
        resolveConfirm = res;
      });
    },

    promptAction(payload) {
      return new Promise<string | null>((res) => {
        batch(() => {
          open.value = true;
          title.value = payload.title;
          message.value = payload.label;
          confirmLabel.value = payload.confirmLabel ?? "Confirm";
          cancelLabel.value = payload.cancelLabel ?? "Cancel";
          showInput.value = true;
          inputLabel.value = payload.label;
          inputValue.value = payload.defaultValue ?? "";
        });
        resolvePrompt = res;
      });
    },

    resolveConfirmAction(ok: boolean) {
      if (resolvePrompt) {
        const value = ok ? inputValue.value : null;
        resolvePrompt(value);
        resolvePrompt = null;
      } else {
        resolveConfirm?.(ok);
        resolveConfirm = null;
      }
      batch(() => {
        open.value = false;
        title.value = "";
        message.value = "";
        showInput.value = false;
        inputLabel.value = "";
        inputValue.value = "";
        confirmLabel.value = "Confirm";
        cancelLabel.value = "Cancel";
      });
    },
  };
});

export const confirmActionModel = new ConfirmActionModel();
