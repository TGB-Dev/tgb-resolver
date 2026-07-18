import { Button, Field, FileUpload, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";

import { useImportShowMutation } from "@/features/control/hooks";
import { floatingPanelModel } from "@/models/floating-panel";

export function ImportShowPanel() {
  const file = useSignal<File | null>(null);
  const excludedUsernames = useSignal("");
  const setDirty = floatingPanelModel.setDirty;
  const closeFloatingPanel = floatingPanelModel.closeFloatingPanel;
  const importShow = useImportShowMutation();

  const accept = async () => {
    if (!file.value) return;

    await importShow.mutateAsync({
      file: file.value,
      excludedUsernames: excludedUsernames.value
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
          file.value = f;
          setDirty(Boolean(f) || excludedUsernames.value.length > 0);
        }}
      >
        <FileUpload.HiddenInput />
        <FileUpload.Label>Show file</FileUpload.Label>
        <HStack gap={2} mt={2}>
          <FileUpload.Trigger asChild>
            <Button variant="outline" size="sm">
              {file.value ? file.value.name : "Choose file for upload"}
            </Button>
          </FileUpload.Trigger>
          {file.value && (
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
          value={excludedUsernames.value}
          onChange={(event) => {
            const target = event.target as HTMLInputElement;
            excludedUsernames.value = target.value;
            setDirty(Boolean(file.value) || target.value.length > 0);
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
        <Button disabled={!file.value || importShow.isPending} onClick={() => void accept()}>
          Import
        </Button>
      </HStack>
    </Stack>
  );
}
