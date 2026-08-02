import { Box, Field, HStack, Input, Text } from "@chakra-ui/react";
import type { ReactRendererProps } from "@tgb-form/react";
import { FileUp } from "lucide-react";
import { useState } from "react";

import { INTERNAL_DRAG_MIME } from "@/features/assets-manager/assets-interaction-model";
import { assetsManagerModel } from "@/features/assets-manager/assets-manager-model";

export function getDroppedAssetId(
  dataTransfer: DataTransfer,
  isSelectable: (id: string) => boolean,
): string {
  try {
    const ids = JSON.parse(dataTransfer.getData(INTERNAL_DRAG_MIME));
    if (Array.isArray(ids)) {
      const id = ids.find(
        (candidate): candidate is string =>
          typeof candidate === "string" && isSelectable(candidate),
      );
      if (id) return id;
    }
  } catch {
    // Fall through to legacy drag payloads.
  }

  const customData = dataTransfer.getData("application/tgb-asset");
  if (customData) {
    try {
      const parsed = JSON.parse(customData);
      if (parsed && typeof parsed.id === "string" && isSelectable(parsed.id)) return parsed.id;
    } catch {
      // Ignore malformed legacy payloads.
    }
  }

  const text = dataTransfer.getData("text/plain").trim();
  return text && isSelectable(text) ? text : "";
}

function validationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function AssetSelectorRenderer({
  field,
  label,
  description,
  props,
  errors,
}: ReactRendererProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const currentValue = typeof field.state.value === "string" ? field.state.value : "";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedId = getDroppedAssetId(e.dataTransfer, (id) => {
      const entry = assetsManagerModel.findEntry(id);
      return entry !== undefined && !entry.isDirectory;
    });

    if (droppedId) {
      field.handleChange(droppedId);
    }
  };

  return (
    <Field.Root w="full" invalid={errors.length > 0}>
      {label && <Field.Label>{label}</Field.Label>}
      <Box
        w="full"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        p={3}
        borderRadius="md"
        borderWidth={2}
        borderStyle="dashed"
        borderColor={isDragOver ? "border.emphasized" : "border"}
        bg={isDragOver ? "bg.emphasized" : "bg.subtle"}
        transition="all 0.15s ease"
      >
        <HStack gap={3}>
          <FileUp size={20} />
          <Box flex={1}>
            <Input
              size="sm"
              w="full"
              value={currentValue}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder={
                typeof props?.placeholder === "string"
                  ? props.placeholder
                  : "Drop asset here or enter Asset ID..."
              }
              bg="bg"
            />
          </Box>
        </HStack>
        <Text fontSize="xs" color="fg.muted" mt={1}>
          Drag & drop an asset from Asset Manager into this box
        </Text>
      </Box>
      {description && <Field.HelperText>{description}</Field.HelperText>}
      {errors.length > 0 && (
        <Text color="fg.error" fontSize="sm">
          {errors.map(validationErrorMessage).join(", ")}
        </Text>
      )}
    </Field.Root>
  );
}
