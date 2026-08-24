import { toaster } from "@/features/shared/ui/toaster";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

import { useAssetsInteractionStore } from "./assets-interaction-store";
import { useAssetsManagerStore } from "./assets-manager-store";
import { processUploadBatch } from "./upload-helpers";
import type { ContextMenuState } from "./use-entry-context-menu";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

function handleOperationError(error: unknown, label: string): void {
  const description = error instanceof Error ? error.message : String(error);
  toaster.create({ title: label, description, type: "error" });
}

async function promptFiles(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => resolve(input.files);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function promptDirectory(): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.webkitdirectory = true;
    input.onchange = () => resolve(input.files);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * All entry context menu operations. Each handler closes the menu first,
 * matching the React reference behavior.
 */
export function useEntryMenuActions(close: () => void, state: () => ContextMenuState) {
  const store = useAssetsManagerStore();
  const interactionStore = useAssetsInteractionStore();
  const confirmStore = useConfirmActionStore();

  async function handleUploadFiles(folderId: string | null) {
    close();
    const files = await promptFiles();
    if (files) {
      const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
      processUploadBatch(folderId, items, () => {});
    }
  }

  async function handleUploadFolder(folderId: string | null) {
    close();
    const files = await promptDirectory();
    if (files) {
      const items = Array.from(files).map((f) => {
        const pathParts = f.webkitRelativePath.split("/").slice(0, -1);
        return { isFile: true, file: f, pathParts };
      });
      processUploadBatch(folderId, items, () => {});
    }
  }

  async function handleCreateFolder(folderId: string | null) {
    close();
    const name = await confirmStore.promptAction({
      title: "Create Folder",
      label: "Folder name",
      confirmLabel: "Create",
    });
    if (name?.trim()) {
      await store
        .createFolder(folderId, name.trim())
        .catch((error) => handleOperationError(error, "Create Folder"));
    }
  }

  async function handlePaste(folderId: string | null) {
    close();
    try {
      await interactionStore.pasteInto(folderId);
    } catch (error) {
      handleOperationError(error, "Paste");
    }
  }

  function handleOpenFile(id: string) {
    close();
    window.open(`${API_URL}/assets/${id}`, "_blank");
  }

  function handleDownloadFile(target: NonNullable<ContextMenuState["target"]>) {
    close();
    const a = document.createElement("a");
    a.href = `${API_URL}/assets/${target.id}`;
    a.download = target.name;
    a.click();
  }

  function handleCopy(id: string) {
    close();
    interactionStore.copySelection(id);
  }

  function handleCut(id: string) {
    close();
    interactionStore.cutSelection(id);
  }

  async function handleRename(
    target: NonNullable<ContextMenuState["target"]>,
    isDirectory: boolean,
  ) {
    close();
    const name = await confirmStore.promptAction({
      title: isDirectory ? "Rename Folder" : "Rename File",
      label: "New name",
      defaultValue: target.name,
      confirmLabel: "Rename",
    });
    if (name?.trim()) {
      store.renameEntry(target.id, isDirectory, name.trim());
    }
  }

  async function handleDeleteFile(target: NonNullable<ContextMenuState["target"]>) {
    close();
    const accepted = await confirmStore.confirmAction({
      title: "Delete File",
      message: `Delete "${target.name}"?`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (accepted) {
      store.deleteEntry(target.id, false);
    }
  }

  async function handleDeleteFolder() {
    close();
    const accepted = await confirmStore.confirmAction({
      title: "Delete Folder",
      message: "Delete this folder and its contents?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });
    if (accepted) {
      const target = state().target;
      if (target) {
        store.deleteEntry(target.id, true);
      }
    }
  }

  return {
    handleUploadFiles,
    handleUploadFolder,
    handleCreateFolder,
    handlePaste,
    handleOpenFile,
    handleDownloadFile,
    handleCopy,
    handleCut,
    handleRename,
    handleDeleteFile,
    handleDeleteFolder,
  };
}
