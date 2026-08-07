import { Box, Editable } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { type MouseEvent, type ReactNode, useCallback } from "react";

export interface TimelineCellEditableProps {
  value: string;
  displayValue: ReactNode;
  placeholder?: string;
  onBlankCommit?: () => void;
  textAlign?: "start" | "end";
  fontFamily?: string;
  onCommit: (value: string) => void;
}

export function TimelineCellEditable({
  value,
  displayValue,
  placeholder,
  onBlankCommit,
  textAlign = "start",
  fontFamily,
  onCommit,
}: TimelineCellEditableProps) {
  const editing = useSignal(false);
  const draft = useSignal(value);

  const handleDoubleClickPreview = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      draft.value = value;
      editing.value = true;
    },
    [draft, editing, value],
  );

  const handleDoubleClickEditable = useCallback((event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
  }, []);

  const handleValueChange = useCallback(
    ({ value }: { value: string }) => {
      draft.value = value;
    },
    [draft],
  );

  const handleValueCommit = useCallback(
    ({ value }: { value: string }) => {
      if (value.trim().length === 0 && onBlankCommit) onBlankCommit();
      else onCommit(value);
      editing.value = false;
    },
    [editing, onBlankCommit, onCommit],
  );

  const handleValueRevert = useCallback(() => {
    editing.value = false;
  }, [editing]);

  if (!editing.value) {
    return (
      <Box
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
        onDoubleClick={handleDoubleClickPreview}
      >
        {displayValue}
      </Box>
    );
  }

  return (
    <Editable.Root
      defaultEdit
      submitMode="both"
      value={draft.value}
      placeholder={placeholder}
      onDoubleClick={handleDoubleClickEditable}
      onValueChange={handleValueChange}
      onValueCommit={handleValueCommit}
      onValueRevert={handleValueRevert}
    >
      <Editable.Preview
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        cursor="text"
        overflow="hidden"
        textOverflow="ellipsis"
        whiteSpace="nowrap"
      />
      <Editable.Input
        px={1}
        py={0.5}
        minH={6}
        borderRadius="sm"
        textAlign={textAlign}
        fontFamily={fontFamily}
        bg="bg.panel"
        autoFocus
      />
    </Editable.Root>
  );
}
