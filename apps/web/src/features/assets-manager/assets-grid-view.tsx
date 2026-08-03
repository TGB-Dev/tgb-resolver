import { Box, Grid, Image, Text } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { File, Folder } from "lucide-react";
import { useRef } from "react";

import { toaster } from "@/features/shared/ui/toaster";

import { assetsInteractionModel, INTERNAL_DRAG_MIME } from "./assets-interaction-model";
import { assetsManagerModel } from "./assets-manager-model";
import { ContextMenuOverlay } from "./context-menu-overlay";
import { useEntryContextMenu } from "./use-entry-context-menu";
import { type Rect, useRubberBandSelect } from "./use-rubber-band-select";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";

export function AssetsGridView() {
  const entries = assetsManagerModel.entries.value;
  const selectedIds = assetsManagerModel.selectedIds.value;
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenu = useEntryContextMenu();

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
    if ((e.target as HTMLElement).closest("[data-context-menu]")) return;
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

  function handleDropError(error: unknown): void {
    toaster.create({
      title: "Move assets",
      description: error instanceof Error ? error.message : String(error),
      type: "error",
    });
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
          contextMenu.openForContainer(e);
        }
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-context-menu]")) return;
        assetsManagerModel.focusedPanel.value = "content";
        containerHandlers.onPointerDown(e);
      }}
      onPointerMove={containerHandlers.onPointerMove}
      onPointerUp={containerHandlers.onPointerUp}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("[data-context-menu]")) return;
        containerHandlers.onClickCapture(e);
      }}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") assetsManagerModel.clearSelection();
      }}
      onDragOver={(e) => {
        if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
        e.preventDefault();
        const effect: "copy" | "move" = e.altKey ? "copy" : "move";
        assetsInteractionModel.setDragEffect(effect);
        e.dataTransfer.dropEffect = effect;
      }}
      onDrop={(e) => {
        if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
        e.preventDefault();
        const effect: "copy" | "move" = e.altKey ? "copy" : "move";
        void assetsInteractionModel
          .dropInto(assetsManagerModel.selectedEntryId.value, effect)
          .catch(handleDropError);
      }}
    >
      {entries.length === 0 ? (
        <Box display="flex" alignItems="center" justifyContent="center" h="full">
          <Text color="fg.muted">Empty</Text>
        </Box>
      ) : (
        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4} p={4}>
          {entries.map((entry, index) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              isSelected={selectedIds.has(entry.id)}
              onContextMenu={(e) => {
                if (!selectedIds.has(entry.id)) {
                  assetsManagerModel.selectedIds.value = new Set([entry.id]);
                }
                contextMenu.openForEntry(e, {
                  id: entry.id,
                  name: entry.name,
                  isDirectory: entry.isDirectory,
                });
              }}
              onDragStart={(e) => {
                const effect: "copy" | "move" = e.altKey ? "copy" : "move";
                const dragIds = assetsInteractionModel.beginDrag(entry.id, effect);
                e.dataTransfer.effectAllowed = "copyMove";
                e.dataTransfer.setData(INTERNAL_DRAG_MIME, JSON.stringify(dragIds));
              }}
              onDragEnd={() => {
                assetsInteractionModel.clearDrag();
              }}
              onDragOver={
                entry.isDirectory
                  ? (e) => {
                      if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
                      e.preventDefault();
                      const effect: "copy" | "move" = e.altKey ? "copy" : "move";
                      assetsInteractionModel.setDragEffect(effect);
                      e.dataTransfer.dropEffect = effect;
                    }
                  : undefined
              }
              onDrop={
                entry.isDirectory
                  ? (e) => {
                      if (!assetsInteractionModel.isInternalDragData(e.dataTransfer)) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const effect: "copy" | "move" = e.altKey ? "copy" : "move";
                      void assetsInteractionModel.dropInto(entry.id, effect).catch(handleDropError);
                    }
                  : undefined
              }
              onClick={(e) => handleEntryClick(e, index)}
              onDoubleClick={() => handleDoubleClick(entry)}
            />
          ))}
        </Grid>
      )}
      {selectionRect.value && <SelectionRectOverlay rect={selectionRect.value} />}
      <ContextMenuOverlay state={contextMenu.state} onClose={() => contextMenu.close()} />
    </Box>
  );
}

function EntryCard({
  entry,
  isSelected,
  onContextMenu,
  onClick,
  onDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
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
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) {
  const imgError = useSignal(false);
  const isImage = !entry.isDirectory && entry.contentType?.startsWith("image/");

  return (
    <Box
      data-entry-id={entry.id}
      draggable
      borderWidth={2}
      borderColor={isSelected ? "colorPalette.border" : "border"}
      borderRadius="md"
      overflow="hidden"
      cursor="pointer"
      _hover={{ shadow: "md" }}
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
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Box h={32} display="flex" alignItems="center" justifyContent="center" bg="bg.subtle">
        {entry.isDirectory ? (
          <Folder size={40} />
        ) : isImage && !imgError.value ? (
          <Image
            src={`${API_URL}/assets/${entry.id}`}
            alt={entry.name}
            boxSize="full"
            objectFit="contain"
            onError={() => (imgError.value = true)}
          />
        ) : (
          <File size={40} />
        )}
      </Box>
      <Box p={3}>
        <Text fontSize="sm" fontWeight="medium" wordBreak="break-all">
          {entry.name}
        </Text>
        {!entry.isDirectory && (
          <Text fontSize="xs" color="fg.muted" mt={1}>
            {formatSize(entry.sizeBytes ?? 0)}
          </Text>
        )}
      </Box>
    </Box>
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
