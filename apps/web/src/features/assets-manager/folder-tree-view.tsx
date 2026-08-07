import { Box, ButtonGroup, IconButton } from "@chakra-ui/react";
import { useComputed } from "@preact/signals-react";
import { ChevronsDownUp, ChevronsUpDown, Folder, FolderOpen } from "lucide-react";
import { useRef } from "react";

import { toaster } from "@/features/shared/ui/toaster";

import { assetsInteractionModel, INTERNAL_DRAG_MIME } from "./assets-interaction-model";
import { assetsManagerModel } from "./assets-manager-model";
import { ContextMenuOverlay } from "./context-menu-overlay";
import type { FsEntry } from "./types";
import { useEntryContextMenu } from "./use-entry-context-menu";

function FolderNode({
  node,
  onContextMenu,
}: {
  node: FsEntry;
  onContextMenu: (
    e: React.MouseEvent,
    target: { id: string; name: string; isDirectory: boolean } | null,
  ) => void;
}) {
  const isExpanded = useComputed(() => assetsManagerModel.expandedFolderIds.value.has(node.id));
  const isSelected = useComputed(() => assetsManagerModel.selectedEntryId.value === node.id);
  const isDropTarget = useComputed(() => assetsInteractionModel.dropTargetId.value === node.id);

  function handleDropError(error: unknown): void {
    toaster.create({
      title: "Move assets",
      description: error instanceof Error ? error.message : String(error),
      type: "error",
    });
  }

  const handleClick = () => {
    const isSameFolder = assetsManagerModel.selectedEntryId.value === node.id;
    const isNowExpanded = isExpanded.value;
    const hasChildren = !!(node.children && node.children.length > 0);

    assetsManagerModel.focusedPanel.value = "tree";
    assetsManagerModel.selectEntry(node.id);

    if (hasChildren) {
      if (isSameFolder) {
        assetsManagerModel.toggleFolder(node.id);
      } else if (!isNowExpanded) {
        assetsManagerModel.toggleFolder(node.id);
      }
    }
  };

  return (
    <Box>
      <Box
        as="button"
        draggable
        display="flex"
        alignItems="center"
        gap={2}
        w="full"
        px={2}
        py={1.5}
        fontSize="sm"
        fontWeight="normal"
        cursor="pointer"
        borderLeftWidth={3}
        borderLeftColor={
          isDropTarget.value || isSelected.value ? "colorPalette.border" : "transparent"
        }
        bg={isDropTarget.value ? "bg.muted" : isSelected.value ? "bg.muted" : undefined}
        color={isSelected.value ? "colorPalette" : undefined}
        _hover={{ bg: "bg.subtle" }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onContextMenu(e, { id: node.id, name: node.name, isDirectory: true });
        }}
        onDragStart={(e) => {
          const effect: "copy" | "move" = e.altKey ? "copy" : "move";
          const dragIds = assetsInteractionModel.beginDrag(node.id, effect);
          e.dataTransfer.effectAllowed = "copyMove";
          e.dataTransfer.setData(INTERNAL_DRAG_MIME, JSON.stringify(dragIds));
        }}
        onDragEnd={() => assetsInteractionModel.clearDrag()}
        onDragOver={(e) => {
          if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          assetsInteractionModel.setDropTarget(node.id);
          e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (assetsInteractionModel.dropTargetId.peek() === node.id)
            assetsInteractionModel.setDropTarget(null);
        }}
        onDrop={(e) => {
          if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
          e.preventDefault();
          e.stopPropagation();
          assetsInteractionModel.setDropTarget(node.id);
          void assetsInteractionModel
            .dropInto(node.id, e.altKey ? "copy" : "move")
            .catch(handleDropError);
        }}
      >
        {isExpanded.value ? <FolderOpen size={14} /> : <Folder size={14} />}
        <Box as="span">{node.name}</Box>
        {isDropTarget.value && (
          <Box as="span" ms="auto" fontSize="xs">
            Drop here
          </Box>
        )}
      </Box>
      {isExpanded.value && node.children && node.children.length > 0 && (
        <Box pl={4}>
          {node.children.map((child) => (
            <FolderNode key={child.id} node={child} onContextMenu={onContextMenu} />
          ))}
        </Box>
      )}
    </Box>
  );
}

function AllAssetsButton() {
  const isSelected = useComputed(() => assetsManagerModel.selectedEntryId.value === null);
  const isDropTarget = useComputed(
    () =>
      assetsInteractionModel.dropTargetId.value === null &&
      assetsInteractionModel.dragState.value !== null,
  );

  return (
    <Box
      as="button"
      display="flex"
      alignItems="center"
      gap={2}
      w="full"
      px={2}
      py={1.5}
      fontSize="sm"
      fontWeight="normal"
      cursor="pointer"
      borderLeftWidth={3}
      borderLeftColor={
        isDropTarget.value || isSelected.value ? "colorPalette.border" : "transparent"
      }
      bg={isDropTarget.value ? "bg.muted" : isSelected.value ? "bg.muted" : undefined}
      color={isSelected.value ? "colorPalette" : undefined}
      _hover={{ bg: "bg.subtle" }}
      onClick={() => {
        assetsManagerModel.focusedPanel.value = "tree";
        assetsManagerModel.selectEntry(null);
      }}
    >
      <Folder size={14} />
      <Box as="span">All Assets</Box>
    </Box>
  );
}

export function FolderTreeView() {
  const tree = assetsManagerModel.folderTree.value;
  const contextMenu = useEntryContextMenu();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleContextMenu(
    e: React.MouseEvent,
    target: { id: string; name: string; isDirectory: boolean } | null,
  ) {
    const isOnButton = (e.target as HTMLElement).closest("button");
    if (!target && isOnButton) return;
    if (target) {
      contextMenu.openForEntry(e, target);
      return;
    }

    contextMenu.openForContainer(e);
  }

  return (
    <Box
      overflowY="auto"
      h="full"
      px={2}
      pt={2}
      onPointerDown={() => {
        assetsManagerModel.focusedPanel.value = "tree";
      }}
      onContextMenu={(e) => handleContextMenu(e, null)}
      onDragOver={(e) => {
        if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        assetsInteractionModel.setDropTarget(null);
        e.dataTransfer.dropEffect = e.altKey ? "copy" : "move";
      }}
      onDrop={(e) => {
        if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
        e.preventDefault();
        assetsInteractionModel.setDropTarget(null);
        void assetsInteractionModel.dropInto(null, e.altKey ? "copy" : "move");
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between" px={1} mb={1}>
        <AllAssetsButton />
        <ButtonGroup size="xs" variant="ghost" attached>
          <IconButton
            aria-label="Expand all folders"
            title="Expand all"
            onClick={() => assetsManagerModel.expandAll()}
          >
            <ChevronsUpDown size={14} />
          </IconButton>
          <IconButton
            aria-label="Collapse all folders"
            title="Collapse all"
            onClick={() => assetsManagerModel.collapseAll()}
          >
            <ChevronsDownUp size={14} />
          </IconButton>
        </ButtonGroup>
      </Box>
      <Box pl={4}>
        {tree.map((folder) => (
          <FolderNode key={folder.id} node={folder} onContextMenu={handleContextMenu} />
        ))}
      </Box>

      <ContextMenuOverlay state={contextMenu.state} onClose={() => contextMenu.close()} />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            for (const file of files) {
              assetsManagerModel.uploadAsset(null, file).catch(console.error);
            }
          }
          e.target.value = "";
        }}
      />
    </Box>
  );
}
