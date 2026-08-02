import { Box, Splitter, useSplitter } from "@chakra-ui/react";
import { useHotkey, useHotkeySequence } from "@tanstack/react-hotkeys";
import { useRef } from "react";

import { confirmActionModel } from "@/features/shared/confirm-action-model";
import { toaster } from "@/features/shared/ui/toaster";

import { AssetsGridView } from "./assets-grid-view";
import { assetsInteractionModel } from "./assets-interaction-model";
import { AssetsListView } from "./assets-list-view";
import { assetsManagerModel } from "./assets-manager-model";
import { AssetsToolbar } from "./assets-toolbar";
import { FolderTreeView } from "./folder-tree-view";
import { UploadZone } from "./upload-zone";

export function AssetsManager() {
  const viewMode = assetsManagerModel.viewMode.value;
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleError(e: unknown, label: string): void {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`${label} error:`, e);
    toaster.create({ title: label, description: msg, type: "error" });
  }

  useHotkey("Backspace", () => {
    const isTree = assetsManagerModel.focusedPanel.value === "tree";
    const ids = isTree
      ? assetsManagerModel.selectedEntryId.value
        ? new Set([assetsManagerModel.selectedEntryId.value])
        : new Set<string>()
      : assetsManagerModel.selectedIds.value;

    if (ids.size === 0) return;
    for (const id of ids) {
      const entry = assetsManagerModel.findEntry(id);
      if (!entry) continue;
      confirmActionModel
        .confirmAction({
          title: entry.isDirectory ? "Delete Folder" : "Delete File",
          message: entry.isDirectory
            ? `Delete ${ids.size > 1 ? `${ids.size} folders` : "this folder"} and its contents?`
            : `Delete ${ids.size > 1 ? `${ids.size} files` : `"${entry.name}"`}?`,
          confirmLabel: "Delete",
          cancelLabel: "Cancel",
        })
        .then((accepted) => {
          if (accepted)
            assetsManagerModel
              .deleteEntry(id, entry.isDirectory)
              .catch((e) => handleError(e, "Delete"));
        });
    }
  });

  useHotkey("F2", () => {
    const isTree = assetsManagerModel.focusedPanel.value === "tree";
    const ids = isTree
      ? assetsManagerModel.selectedEntryId.value
        ? new Set([assetsManagerModel.selectedEntryId.value])
        : new Set<string>()
      : assetsManagerModel.selectedIds.value;

    if (ids.size !== 1) return;
    const id = [...ids][0];
    const entry = assetsManagerModel.findEntry(id);
    if (!entry) return;
    confirmActionModel
      .promptAction({
        title: entry.isDirectory ? "Rename Folder" : "Rename File",
        label: "New name",
        defaultValue: entry.name,
        confirmLabel: "Rename",
      })
      .then((name) => {
        if (name?.trim())
          assetsManagerModel
            .renameEntry(id, entry.isDirectory, name.trim())
            .catch((e) => handleError(e, "Rename"));
      });
  });

  useHotkey("Mod+I", () => {
    fileInputRef.current?.click();
  });

  useHotkey("Mod+C", () => {
    assetsInteractionModel.copySelection();
  });

  useHotkey("Mod+X", () => {
    assetsInteractionModel.cutSelection();
  });

  useHotkey("Mod+V", () => {
    const isTree = assetsManagerModel.focusedPanel.value === "tree";
    const targetFolderId = isTree
      ? assetsManagerModel.selectedEntryId.value
      : assetsManagerModel.selectedEntryId.value;
    void assetsInteractionModel.pasteInto(targetFolderId ?? null).catch((e) => {
      handleError(e, "Paste");
    });
  });

  useHotkeySequence(["Mod+K", "Mod+I"], () => {
    fileInputRef.current?.click();
  });

  useHotkeySequence(["Mod+K", "Mod+F"], () => {
    const folderId = assetsManagerModel.selectedEntryId.value;
    confirmActionModel
      .promptAction({
        title: folderId ? "Create Subfolder" : "Create Folder",
        label: "Folder name",
        confirmLabel: "Create",
      })
      .then((name) => {
        if (name?.trim())
          assetsManagerModel
            .createFolder(folderId ?? null, name.trim())
            .catch((e) => handleError(e, "Create Folder"));
      });
  });

  const splitter = useSplitter({
    defaultSize: [25, 75],
    panels: [
      { id: "tree", minSize: 15 },
      { id: "content", minSize: 40 },
    ],
  });

  return (
    <Splitter.RootProvider value={splitter} h="full">
      <Splitter.Panel id="tree">
        <FolderTreeView />
      </Splitter.Panel>

      <Splitter.ResizeTrigger id="tree:content" />

      <Splitter.Panel id="content">
        <Box display="flex" flexDirection="column" overflow="hidden" h="full">
          <AssetsToolbar />
          <Box flex={1} overflow="hidden">
            <UploadZone>
              <Box h="full">{viewMode === "list" ? <AssetsListView /> : <AssetsGridView />}</Box>
            </UploadZone>
          </Box>
        </Box>
      </Splitter.Panel>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          const folderId = assetsManagerModel.selectedEntryId.value;
          if (files) {
            for (const file of files) {
              assetsManagerModel.uploadAsset(folderId, file).catch(console.error);
            }
          }
          e.target.value = "";
        }}
      />
    </Splitter.RootProvider>
  );
}
