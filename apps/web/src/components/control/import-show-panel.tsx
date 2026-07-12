import { Button, Field, FileUpload, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";
import { useState } from "react";

import { useImportShowMutation } from "@/features/control/hooks";
import { useFloatingPanelStore } from "@/store/floating-panel";

export function ImportShowPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [excludedUsernames, setExcludedUsernames] = useState("");
  const setDirty = useFloatingPanelStore((s) => s.setDirty);
  const closeFloatingPanel = useFloatingPanelStore((s) => s.closeFloatingPanel);
  const importShow = useImportShowMutation();

  const accept = async () => {
    if (!file) return;

    await importShow.mutateAsync({
      file,
      excludedUsernames: excludedUsernames
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    closeFloatingPanel(true);
  };

  return (
    <Stack gap={4}>
      <FileUpload.Root
        accept={`.xml,${FILE_EXTENSION}`}
        maxFiles={1}
        onFileChange={(details) => {
          const f = details.acceptedFiles[0] ?? null;
          setFile(f);
          setDirty(Boolean(f) || excludedUsernames.length > 0);
        }}
      >
        <FileUpload.HiddenInput />
        <FileUpload.Label>Show file</FileUpload.Label>
        <HStack gap={2} mt={2}>
          <FileUpload.Trigger asChild>
            <Button variant="outline" size="sm">
              {file ? file.name : "Choose file for upload"}
            </Button>
          </FileUpload.Trigger>
          {file && (
            <FileUpload.ClearTrigger asChild>
              <Button variant="ghost" size="sm">
                Clear
              </Button>
            </FileUpload.ClearTrigger>
          )}
        </HStack>
      </FileUpload.Root>

      <Field.Root>
        <Field.Label>Excluded usernames</Field.Label>
        <Input
          value={excludedUsernames}
          onChange={(event) => {
            setExcludedUsernames(event.target.value);
            setDirty(Boolean(file) || event.target.value.length > 0);
          }}
          placeholder="team_a, team_b"
        />
        <Field.HelperText>Comma-separated. Applies to XML imports only.</Field.HelperText>
      </Field.Root>

      {importShow.error ? <Text color="fg.error">{importShow.error.message}</Text> : null}

      <HStack justify="end">
        <Button variant="outline" onClick={() => closeFloatingPanel(false)}>
          Cancel
        </Button>
        <Button disabled={!file || importShow.isPending} onClick={() => void accept()}>
          Import
        </Button>
      </HStack>
    </Stack>
  );
}
