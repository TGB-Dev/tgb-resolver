import { Box, Button, Portal, Separator, Text } from "@chakra-ui/react";

import { confirmActionModel } from "@/features/shared/confirm-action-model";
import { toaster } from "@/features/shared/ui/toaster";

import { assetsInteractionModel } from "./assets-interaction-model";
import { assetsManagerModel } from "./assets-manager-model";
import { processUploadBatch } from "./upload-helpers";
import type { ContextMenuState } from "./use-context-menu";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

interface ContextMenuOverlayProps {
  state: ContextMenuState;
  onClose: () => void;
}

function handleOperationError(error: unknown, label: string): void {
  const description = error instanceof Error ? error.message : String(error);
  toaster.create({ title: label, description, type: "error" });
}

export function ContextMenuOverlay({ state, onClose }: ContextMenuOverlayProps) {
  if (!state.isOpen) return null;

  function handleClose() {
    onClose();
  }

  return (
    <Portal>
      <Box
        data-context-menu
        position="fixed"
        left={state.x}
        top={state.y}
        zIndex="popover"
        bg="bg.panel"
        borderWidth={1}
        borderColor="border"
        rounded="md"
        shadow="lg"
        py={1}
        minW="180px"
      >
        {state.target ? (
          state.target.isDirectory ? (
            <FolderMenuItems target={state.target} onClose={handleClose} />
          ) : (
            <FileMenuItems target={state.target} onClose={handleClose} />
          )
        ) : (
          <ContainerMenuItems targetFolderId={state.targetFolderId} onClose={handleClose} />
        )}
      </Box>
    </Portal>
  );
}

function MenuItemButton({
  label,
  onClick,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      w="full"
      justifyContent="flex-start"
      fontWeight="normal"
      px={3}
      borderRadius="none"
      color={danger ? "fg.error" : undefined}
      disabled={disabled}
      _hover={
        danger ? { bg: "bg.error", color: "fg.error" } : { bg: "bg.subtle", color: undefined }
      }
      onClick={(e) => {
        e.stopPropagation();
        void onClick();
      }}
    >
      {label}
    </Button>
  );
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

function ContainerMenuItems({
  targetFolderId,
  onClose,
}: {
  targetFolderId: string | null;
  onClose: () => void;
}) {
  const canPaste = assetsInteractionModel.canPasteInto(targetFolderId);

  return (
    <>
      <MenuItemButton
        label="Upload Files"
        onClick={async () => {
          const folderId = targetFolderId;
          const files = await promptFiles();
          onClose();
          if (files) {
            const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
            processUploadBatch(folderId, items, () => {});
          }
        }}
      />
      <MenuItemButton
        label="Upload Folder"
        onClick={async () => {
          const folderId = targetFolderId;
          const files = await promptDirectory();
          onClose();
          if (files) {
            const items = Array.from(files).map((f) => {
              const pathParts = f.webkitRelativePath.split("/").slice(0, -1);
              return { isFile: true, file: f, pathParts };
            });
            processUploadBatch(folderId, items, () => {});
          }
        }}
      />
      <MenuItemButton
        label="Paste"
        disabled={!canPaste}
        onClick={async () => {
          onClose();
          try {
            await assetsInteractionModel.pasteInto(targetFolderId);
          } catch (error) {
            handleOperationError(error, "Paste");
          }
        }}
      />
      <Separator />
      <MenuItemButton
        label="Create Folder"
        onClick={async () => {
          const folderId = targetFolderId;
          const name = await confirmActionModel.promptAction({
            title: "Create Folder",
            label: "Folder name",
            confirmLabel: "Create",
          });
          onClose();
          if (name?.trim()) {
            await assetsManagerModel.createFolder(folderId, name.trim()).catch((error) => {
              handleOperationError(error, "Create Folder");
            });
          }
        }}
      />
    </>
  );
}

function FileMenuItems({
  target,
  onClose,
}: {
  target: NonNullable<ContextMenuState["target"]>;
  onClose: () => void;
}) {
  return (
    <>
      <MenuItemButton
        label="Open"
        onClick={() => {
          onClose();
          window.open(`${API_URL}/assets/${target.id}`, "_blank");
        }}
      />
      <MenuItemButton
        label="Download"
        onClick={() => {
          onClose();
          const a = document.createElement("a");
          a.href = `${API_URL}/assets/${target.id}`;
          a.download = target.name;
          a.click();
        }}
      />
      <Separator />
      <MenuItemButton
        label="Copy"
        onClick={() => {
          onClose();
          assetsInteractionModel.copySelection(target.id);
        }}
      />
      <MenuItemButton
        label="Cut"
        onClick={() => {
          onClose();
          assetsInteractionModel.cutSelection(target.id);
        }}
      />
      <MenuItemButton
        label="Paste"
        disabled={!assetsInteractionModel.canPasteInto(assetsManagerModel.selectedEntryId.value)}
        onClick={async () => {
          onClose();
          try {
            await assetsInteractionModel.pasteInto(assetsManagerModel.selectedEntryId.value);
          } catch (error) {
            handleOperationError(error, "Paste");
          }
        }}
      />
      <Separator />
      <MenuItemButton
        label="Rename"
        onClick={async () => {
          onClose();
          const name = await confirmActionModel.promptAction({
            title: "Rename File",
            label: "New name",
            defaultValue: target.name,
            confirmLabel: "Rename",
          });
          if (name?.trim()) {
            assetsManagerModel.renameEntry(target.id, false, name.trim());
          }
        }}
      />
      <MenuItemButton
        label="Delete"
        danger
        onClick={async () => {
          onClose();
          const accepted = await confirmActionModel.confirmAction({
            title: "Delete File",
            message: `Delete "${target.name}"?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
          });
          if (accepted) {
            assetsManagerModel.deleteEntry(target.id, false);
          }
        }}
      />
    </>
  );
}

function FolderMenuItems({
  target,
  onClose,
}: {
  target: NonNullable<ContextMenuState["target"]>;
  onClose: () => void;
}) {
  return (
    <>
      <Text px={3} py={1} fontSize="xs" color="fg.muted" fontWeight="medium">
        {target.name}
      </Text>
      <Separator />
      <MenuItemButton
        label="Upload Files"
        onClick={async () => {
          const files = await promptFiles();
          onClose();
          if (files) {
            const items = Array.from(files).map((f) => ({ isFile: true, file: f, pathParts: [] }));
            processUploadBatch(target.id, items, () => {});
          }
        }}
      />
      <MenuItemButton
        label="Upload Folder"
        onClick={async () => {
          const files = await promptDirectory();
          onClose();
          if (files) {
            const items = Array.from(files).map((f) => {
              const pathParts = f.webkitRelativePath.split("/").slice(0, -1);
              return { isFile: true, file: f, pathParts };
            });
            processUploadBatch(target.id, items, () => {});
          }
        }}
      />
      <MenuItemButton
        label="Create Folder"
        onClick={async () => {
          onClose();
          const name = await confirmActionModel.promptAction({
            title: "Create Folder",
            label: "Folder name",
            confirmLabel: "Create",
          });
          if (name?.trim()) {
            assetsManagerModel.createFolder(target.id, name.trim());
          }
        }}
      />
      <Separator />
      <MenuItemButton
        label="Copy"
        onClick={() => {
          onClose();
          assetsInteractionModel.copySelection(target.id);
        }}
      />
      <MenuItemButton
        label="Cut"
        onClick={() => {
          onClose();
          assetsInteractionModel.cutSelection(target.id);
        }}
      />
      <MenuItemButton
        label="Paste"
        disabled={!assetsInteractionModel.canPasteInto(target.id)}
        onClick={async () => {
          onClose();
          try {
            await assetsInteractionModel.pasteInto(target.id);
          } catch (error) {
            handleOperationError(error, "Paste");
          }
        }}
      />
      <Separator />
      <MenuItemButton
        label="Rename"
        onClick={async () => {
          onClose();
          const name = await confirmActionModel.promptAction({
            title: "Rename Folder",
            label: "New name",
            defaultValue: target.name,
            confirmLabel: "Rename",
          });
          if (name?.trim()) {
            assetsManagerModel.renameEntry(target.id, true, name.trim());
          }
        }}
      />
      <MenuItemButton
        label="Delete"
        danger
        onClick={async () => {
          onClose();
          const accepted = await confirmActionModel.confirmAction({
            title: "Delete Folder",
            message: "Delete this folder and its contents?",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
          });
          if (accepted) {
            assetsManagerModel.deleteEntry(target.id, true);
          }
        }}
      />
    </>
  );
}
