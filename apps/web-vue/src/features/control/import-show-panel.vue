<script setup lang="ts">
import {
  FileUploadClearTrigger,
  FileUploadHiddenInput,
  FileUploadLabel,
  FileUploadRoot,
  FileUploadTrigger,
} from "@ark-ui/vue";
import { css } from "@styled-system/css";
import { fileUpload, input } from "@styled-system/recipes";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";
import { ref } from "vue";

import { useImportShowMutation } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import Button from "@/features/shared/ui/button.vue";
import { toaster } from "@/features/shared/ui/toaster";

const props = defineProps<{
  panel: FloatingPanelHandle;
}>();

const file = ref<File | null>(null);
const excludedUsernames = ref("");
const importShow = useImportShowMutation();

const fileUploadClasses = fileUpload();
const inputClasses = input({ size: "sm" });

const root = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "stretch" });
const triggerRow = css({ display: "flex", gap: "2", marginTop: "2" });
const field = css({ display: "flex", flexDirection: "column", gap: "1" });
const fieldLabel = css({ fontSize: "sm", fontWeight: "medium" });
const helper = css({ fontSize: "xs", color: "fg.muted" });
const errorText = css({ color: "fg.error", fontSize: "sm" });
const actions = css({ display: "flex", justifyContent: "flex-end", gap: "2", marginTop: "4" });

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
  <div :class="root">
    <FileUploadRoot
      :accept="`.xml,${FILE_EXTENSION}`"
      :maxFiles="1"
      :class="fileUploadClasses.root"
      @file-change="(details: { acceptedFiles: File[] }) => {
        const f = details.acceptedFiles[0] ?? null;
        file = f;
        panel.setDirty(Boolean(f) || excludedUsernames.length > 0);
      }"
    >
      <FileUploadHiddenInput />
      <FileUploadLabel :class="fileUploadClasses.label">Show file</FileUploadLabel>
      <div :class="triggerRow">
        <FileUploadTrigger asChild>
          <Button variant="outline" size="sm">
            {{ file ? file.name : "Choose file for upload" }}
          </Button>
        </FileUploadTrigger>
        <FileUploadClearTrigger v-if="file" asChild>
          <Button variant="ghost" size="sm">
            Clear
          </Button>
        </FileUploadClearTrigger>
      </div>
    </FileUploadRoot>

    <div :class="field">
      <span :class="fieldLabel">Excluded usernames</span>
      <input
        v-model="excludedUsernames"
        :class="inputClasses"
        placeholder="team_a, team_b"
        @input="panel.setDirty(Boolean(file) || excludedUsernames.length > 0)"
      />
      <span :class="helper">
        Comma-separated. Applies to XML imports only.
      </span>
    </div>

    <p v-if="importShow.error" :class="errorText">
      {{ errorMessage(importShow.error) }}
    </p>

    <div :class="actions">
      <Button variant="outline" @click="panel.close(false)">
        Cancel
      </Button>
      <Button :disabled="!file || importShow.isPending.value" @click="accept">
        Import
      </Button>
    </div>
  </div>
</template>
