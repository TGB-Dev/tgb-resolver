import { Box, Field, HStack, Input, Text } from "@chakra-ui/react";
import type { ReactRendererProps } from "@tgb-form/react";
import { FileUp } from "lucide-react";
import { useState } from "react";

export function AssetSelectorRenderer({
  field,
  label,
  description,
  props,
  errors,
}: ReactRendererProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const currentValue = String(field.state.value ?? "");

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

    let droppedId = "";
    const customData = e.dataTransfer.getData("application/tgb-asset");
    if (customData) {
      try {
        const parsed = JSON.parse(customData);
        if (parsed && typeof parsed.id === "string") {
          droppedId = parsed.id;
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!droppedId) {
      droppedId = e.dataTransfer.getData("text/plain").trim();
    }

    if (droppedId) {
      field.handleChange(droppedId);
    }
  };

  return (
    <Field.Root invalid={errors.length > 0}>
      {label && <Field.Label>{label}</Field.Label>}
      <Box
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
          {errors.map(String).join(", ")}
        </Text>
      )}
    </Field.Root>
  );
}
