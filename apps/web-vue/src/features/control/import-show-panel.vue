<script setup lang="ts">
import {
  FileUploadClearTrigger,
  FileUploadHiddenInput,
  FileUploadLabel,
  FileUploadRoot,
  FileUploadTrigger,
} from "@ark-ui/vue";
import { HStack, Stack, VStack } from "@styled-system/jsx";
import { fileUpload, input } from "@styled-system/recipes";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";
import { ref } from "vue";

import { useImportShowMutation } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import UiButton from "@/features/shared/ui/button.vue";
import { toaster } from "@/features/shared/ui/toaster";

defineOptions({ name: "ImportShowPanel" });

const props = defineProps<{
  panel: FloatingPanelHandle;
}>();

const file = ref<File | null>(null);
const excludedUsernames = ref("");
const importShow = useImportShowMutation();

const fileUploadClasses = fileUpload();
const inputClasses = input({ size: "sm" });

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

async function accept() {
  if (!file.value) return;

  try {
    await importShow.mutateAsync({
      file: file.value,
      excludedUsernames: excludedUsernames.value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    props.panel.close(true);
  } catch (error) {
    toaster.create({
      title: "Import failed",
      description: errorMessage(error),
      type: "error",
    });
  }
}
</script>

<template>
  <VStack gap="4" alignItems="stretch" p="4">
    <FileUploadRoot
      :accept="`.xml,${FILE_EXTENSION}`"
      :maxFiles="1"
      :class="fileUploadClasses.root"
      @file-change="(details) => {
        const f = details.acceptedFiles[0] ?? null;
        file = f;
        panel.setDirty(Boolean(f) || excludedUsernames.length > 0);
      }"
    >
      <FileUploadHiddenInput />
      <FileUploadLabel :class="fileUploadClasses.label">Show file</FileUploadLabel>
      <HStack gap="2" mt="2">
        <FileUploadTrigger asChild>
          <UiButton variant="outline" size="sm">
            {{ file ? file.name : "Choose file for upload" }}
          </UiButton>
        </FileUploadTrigger>
        <FileUploadClearTrigger v-if="file" asChild>
          <UiButton variant="ghost" size="sm">
            Clear
          </UiButton>
        </FileUploadClearTrigger>
      </HStack>
    </FileUploadRoot>

    <Stack gap="1">
      <Box fontSize="sm" fontWeight="medium">Excluded usernames</Box>
      <input
        v-model="excludedUsernames"
        :class="inputClasses"
        placeholder="team_a, team_b"
        @input="panel.setDirty(Boolean(file) || excludedUsernames.length > 0)"
      />
      <Box fontSize="xs" color="fg.muted">
        Comma-separated. Applies to XML imports only.
      </Box>
    </Stack>

    <Box v-if="importShow.error" color="fg.error" fontSize="sm">
      {{ errorMessage(importShow.error) }}
    </Box>

    <HStack justifyContent="flex-end" gap="2" mt="4">
      <UiButton variant="outline" @click="panel.close(false)">
        Cancel
      </UiButton>
      <UiButton :disabled="!file || importShow.isPending.value" @click="accept">
        Import
      </UiButton>
    </HStack>
  </VStack>
</template>
