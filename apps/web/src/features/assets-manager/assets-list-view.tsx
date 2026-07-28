import { Box, Grid, Text } from "@chakra-ui/react";
import { File, Folder } from "lucide-react";
import { useRef } from "react";

import { assetsManagerModel } from "./assets-manager-model";
import { ContextMenuOverlay } from "./context-menu-overlay";
import { useContextMenu } from "./use-context-menu";
import { type Rect, useRubberBandSelect } from "./use-rubber-band-select";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

export function AssetsListView() {
  const entries = assetsManagerModel.entries.value;
  const selectedIds = assetsManagerModel.selectedIds.value;
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenu = useContextMenu();

  const { selectionRect, containerHandlers } = useRubberBandSelect(containerRef, (ids, mod) => {
    if (mod) {
      const next = new Set(assetsManagerModel.selectedIds.value);
      for (const id of ids) next.add(id);
      assetsManagerModel.selectedIds.value = next;
    } else {
      assetsManagerModel.selectedIds.value = new Set(ids);
    }
  });

  function handleContainerClick(e: React.MouseEvent) {
    if (contextMenu.state.target) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-entry-id]")) return;
    assetsManagerModel.clearSelection();
  }

  function handleEntryClick(e: React.MouseEvent, index: number) {
    assetsManagerModel.handleEntryClick(
      { metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey },
      index,
    );
  }

  function handleDoubleClick(entry: { id: string; isDirectory: boolean }) {
    if (entry.isDirectory) {
      assetsManagerModel.selectEntry(entry.id);
    } else {
      window.open(`${API_URL}/assets/${entry.id}`, "_blank");
    }
  }

  if (entries.length === 0) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" h="full">
        <Text color="fg.muted">This folder is empty</Text>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      overflowY="auto"
      h="full"
      userSelect="none"
      onClick={handleContainerClick}
      onContextMenu={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest("[data-entry-id]")) {
          assetsManagerModel.clearSelection();
          contextMenu.open(e, null);
        }
      }}
      onPointerDown={(e) => {
        assetsManagerModel.focusedPanel.value = "content";
        containerHandlers.onPointerDown(e);
      }}
      onPointerMove={containerHandlers.onPointerMove}
      onPointerUp={containerHandlers.onPointerUp}
      onClickCapture={containerHandlers.onClickCapture}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") assetsManagerModel.clearSelection();
      }}
    >
      <Grid
        templateColumns="1fr 120px 100px"
        gap={0}
        fontWeight="medium"
        fontSize="sm"
        color="fg.muted"
        px={4}
        py={2}
        borderBottomWidth={1}
      >
        <Text>Name</Text>
        <Text>Size</Text>
        <Text>Type</Text>
      </Grid>
      {entries.map((entry, index) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          isSelected={selectedIds.has(entry.id)}
          onContextMenu={(e) => {
            if (!selectedIds.has(entry.id)) {
              assetsManagerModel.selectedIds.value = new Set([entry.id]);
            }
            contextMenu.open(e, { id: entry.id, name: entry.name, isDirectory: entry.isDirectory });
          }}
          onClick={(e) => handleEntryClick(e, index)}
          onDoubleClick={() => handleDoubleClick(entry)}
        />
      ))}
      {selectionRect && <SelectionRectOverlay rect={selectionRect} />}
      <ContextMenuOverlay state={contextMenu.state} onClose={() => contextMenu.close()} />
    </Box>
  );
}

function EntryRow({
  entry,
  isSelected,
  onContextMenu,
  onClick,
  onDoubleClick,
}: {
  entry: {
    id: string;
    name: string;
    isDirectory: boolean;
    contentType?: string;
    sizeBytes?: number;
  };
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  return (
    <Grid
      data-entry-id={entry.id}
      templateColumns="1fr 120px 100px"
      gap={0}
      px={4}
      py={1.5}
      fontSize="sm"
      cursor="pointer"
      borderLeftWidth={3}
      borderLeftColor={isSelected ? "colorPalette.border" : "transparent"}
      bg={isSelected ? "bg.accent.muted" : undefined}
      _hover={{ bg: "bg.subtle" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        onContextMenu(e);
      }}
    >
      <Text truncate display="flex" alignItems="center" gap={2}>
        {entry.isDirectory ? <Folder size={14} /> : <File size={14} />}
        {entry.name}
      </Text>
      <Text color="fg.muted" fontFamily="mono">
        {entry.isDirectory ? "--" : formatSize(entry.sizeBytes ?? 0)}
      </Text>
      <Text color="fg.muted" truncate>
        {entry.isDirectory ? "Folder" : entry.contentType}
      </Text>
    </Grid>
  );
}

function SelectionRectOverlay({ rect }: { rect: Rect }) {
  return (
    <Box
      position="fixed"
      left={rect.left}
      top={rect.top}
      width={rect.width}
      height={rect.height}
      bg="colorPalette.solid/10"
      borderWidth={1}
      borderColor="colorPalette.solid"
      pointerEvents="none"
      zIndex="floating"
    />
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
