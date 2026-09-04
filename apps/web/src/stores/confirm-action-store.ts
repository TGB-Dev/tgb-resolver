import { defineStore } from "pinia";
import { ref } from "vue";

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

export const useConfirmActionStore = defineStore("confirm-action", () => {
  const open = ref(false);
  const title = ref("");
  const message = ref("");
  const confirmLabel = ref("Confirm");
  const cancelLabel = ref("Cancel");
  const showInput = ref(false);
  const inputLabel = ref("");
  const inputValue = ref("");
  let resolveConfirm: ((value: boolean) => void) | null = null;
  let resolvePrompt: ((value: string | null) => void) | null = null;

  function setInputValue(value: string) {
    inputValue.value = value;
  }

  function confirmAction(payload: ConfirmActionPayload) {
    return new Promise<boolean>((res) => {
      open.value = true;
      title.value = payload.title;
      message.value = payload.message;
      confirmLabel.value = payload.confirmLabel ?? "Confirm";
      cancelLabel.value = payload.cancelLabel ?? "Cancel";
      showInput.value = false;
      inputValue.value = "";
      resolveConfirm = res;
    });
  }

  function promptAction(payload: PromptActionPayload) {
    return new Promise<string | null>((res) => {
      open.value = true;
      title.value = payload.title;
      message.value = payload.label;
      confirmLabel.value = payload.confirmLabel ?? "Confirm";
      cancelLabel.value = payload.cancelLabel ?? "Cancel";
      showInput.value = true;
      inputLabel.value = payload.label;
      inputValue.value = payload.defaultValue ?? "";
      resolvePrompt = res;
    });
  }

  function resolveConfirmAction(ok: boolean) {
    if (resolvePrompt) {
      const value = ok ? inputValue.value : null;
      resolvePrompt(value);
      resolvePrompt = null;
    } else {
      resolveConfirm?.(ok);
      resolveConfirm = null;
    }
    open.value = false;
    title.value = "";
    message.value = "";
    showInput.value = false;
    inputLabel.value = "";
    inputValue.value = "";
    confirmLabel.value = "Confirm";
    cancelLabel.value = "Cancel";
  }

  return {
    open,
    title,
    message,
    confirmLabel,
    cancelLabel,
    showInput,
    inputLabel,
    inputValue,
    setInputValue,
    confirmAction,
    promptAction,
    resolveConfirmAction,
  };
});
