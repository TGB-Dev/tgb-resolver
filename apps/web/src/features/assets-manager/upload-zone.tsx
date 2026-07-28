import { Box, Text } from "@chakra-ui/react";
import { Upload } from "lucide-react";
import { forwardRef, useState } from "react";

import { assetsManagerModel } from "./assets-manager-model";
import { processUploadBatch } from "./upload-helpers";

interface UploadZoneProps {
  children: React.ReactNode;
}

export const UploadZone = forwardRef<HTMLDivElement, UploadZoneProps>(function UploadZone(
  { children, ...rest },
  ref,
) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }

  async function collectFilesAndFolders(
    entry: FileSystemEntry,
    pathParts: string[],
    result: { isFile: boolean; file?: File; pathParts: string[] }[],
  ): Promise<void> {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file((file: File) => {
          result.push({ isFile: true, file, pathParts });
          resolve();
        });
      });
    } else if (entry.isDirectory) {
      const newPathParts = [...pathParts, entry.name];
      result.push({ isFile: false, pathParts: newPathParts });
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      return new Promise((resolve) => {
        const readEntries = () => {
          reader.readEntries(async (entries: FileSystemEntry[]) => {
            if (entries.length > 0) {
              const promises = entries.map((child) =>
                collectFilesAndFolders(child, newPathParts, result),
              );
              await Promise.all(promises);
              readEntries();
            } else {
              resolve();
            }
          });
        };
        readEntries();
      });
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    const targetFolderId = assetsManagerModel.selectedEntryId.value;
    const collected: { isFile: boolean; file?: File; pathParts: string[] }[] = [];

    if (items) {
      const promises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            promises.push(collectFilesAndFolders(entry, [], collected));
          } else {
            const file = item.getAsFile();
            if (file) {
              collected.push({ isFile: true, file, pathParts: [] });
            }
          }
        }
      }
      await Promise.all(promises);
    } else {
      const files = e.dataTransfer.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          collected.push({ isFile: true, file: files[i], pathParts: [] });
        }
      }
    }

    processUploadBatch(targetFolderId, collected);
  }

  return (
    <Box
      ref={ref}
      {...rest}
      position="relative"
      h="full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {isDragOver && (
        <Box
          position="absolute"
          inset={0}
          bg="bg.subtle/80"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={3}
          zIndex={100}
        >
          <Upload size={32} />
          <Text fontSize="lg" fontWeight="medium">
            Drop files to upload
          </Text>
        </Box>
      )}
    </Box>
  );
});
