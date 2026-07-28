import { Box, ButtonGroup, IconButton } from "@chakra-ui/react";
import { useComputed } from "@preact/signals-react";
import { ChevronsDownUp, ChevronsUpDown, Folder, FolderOpen } from "lucide-react";
import { useRef } from "react";

import { assetsManagerModel } from "./assets-manager-model";
import { ContextMenuOverlay } from "./context-menu-overlay";
import type { FsEntry } from "./types";
import { useContextMenu } from "./use-context-menu";

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
        borderLeftColor={isSelected.value ? "colorPalette.border" : "transparent"}
        bg={isSelected.value ? "bg.accent.muted" : undefined}
        color={isSelected.value ? "fg.accent" : undefined}
        _hover={{ bg: "bg.subtle" }}
        onClick={handleClick}
        onContextMenu={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onContextMenu(e, { id: node.id, name: node.name, isDirectory: true });
        }}
      >
        {isExpanded.value ? <FolderOpen size={14} /> : <Folder size={14} />}
        <Box as="span">{node.name}</Box>
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
      borderLeftColor={isSelected.value ? "colorPalette.border" : "transparent"}
      bg={isSelected.value ? "bg.accent.muted" : undefined}
      color={isSelected.value ? "fg.accent" : undefined}
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
  const contextMenu = useContextMenu();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleContextMenu(
    e: React.MouseEvent,
    target: { id: string; name: string; isDirectory: boolean } | null,
  ) {
    const isOnButton = (e.target as HTMLElement).closest("button");
    if (!target && isOnButton) return;
    contextMenu.open(e, target);
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
