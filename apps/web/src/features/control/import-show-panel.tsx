import { Button, Field, FileUpload, HStack, Input, Stack, Text } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";

import type { FloatingPanelHandle } from "@/features/control/floating-panel-model";
import { useImportShowMutation } from "@/features/control/hooks";
import { toaster } from "@/features/shared/ui/toaster";

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const body = error as { message?: unknown; errors?: Record<string, unknown> };
    const general = body.errors?.generalErrors ?? body.errors?.General;
    if (Array.isArray(general) && typeof general[0] === "string") return general[0];
    if (typeof body.message === "string" && body.message.length > 0) return body.message;
  }
  return "Unknown error";
}

export function ImportShowPanel({ panel }: { panel: FloatingPanelHandle }) {
  const file = useSignal<File | null>(null);
  const excludedUsernames = useSignal("");
  const importShow = useImportShowMutation();

  const accept = async () => {
    if (!file.value) return;

    try {
      await importShow.mutateAsync({
        file: file.value,
        excludedUsernames: excludedUsernames.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      panel.close(true);
    } catch (error) {
      toaster.create({
        title: "Import failed",
        description: errorMessage(error),
        type: "error",
      });
    }
  };

  return (
    <Stack gap={4}>
      <FileUpload.Root
        accept={`.xml,${FILE_EXTENSION}`}
        maxFiles={1}
        onFileChange={(details) => {
          const f = details.acceptedFiles[0] ?? null;
          file.value = f;
          panel.setDirty(Boolean(f) || excludedUsernames.value.length > 0);
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
            panel.setDirty(Boolean(file.value) || target.value.length > 0);
          }}
          placeholder="team_a, team_b"
        />
        <Field.HelperText>Comma-separated. Applies to XML imports only.</Field.HelperText>
      </Field.Root>

      {importShow.error ? <Text color="fg.error">{errorMessage(importShow.error)}</Text> : null}

      <HStack justify="end">
        <Button variant="outline" onClick={() => panel.close(false)}>
          Cancel
        </Button>
        <Button disabled={!file.value || importShow.isPending} onClick={() => void accept()}>
          Import
        </Button>
      </HStack>
    </Stack>
  );
}
