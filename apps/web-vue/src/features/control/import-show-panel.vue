<script setup lang="ts">
import { FileUpload } from "@ark-ui/vue";
import { css } from "@styled-system/css";
import { button, fileUpload, input } from "@styled-system/recipes";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

import { useImportShowMutation } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { toaster } from "@/features/shared/ui/toaster";

const props = defineProps<{
  panel: FloatingPanelHandle;
}>();

const file = ref<File | null>(null);
const excludedUsernames = ref("");
const importShow = useImportShowMutation();

// vue-query's useMutation returns a plain object of refs (unlike useQuery's
// reactive result), so nested state must be unwrapped before template use —
// otherwise `importShow.error` is a truthy Ref object and the error paragraph
// renders "Unknown error" as soon as the dialog opens.
const importError = computed(() =>
  importShow.error.value instanceof Error ? importShow.error.value.message : importShow.error.value,
);
const importPending = computed(() => importShow.isPending.value);

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
    const body = error as {
      message?: unknown;
      errors?: Record<string, unknown> | undefined;
    };
    const errors = body.errors;
    if (errors) {
      // FastEndpoints surfaces endpoint AddError() failures under "GeneralErrors".
      for (const key of ["GeneralErrors", "generalErrors", "General"]) {
        const general = errors[key];
        if (Array.isArray(general) && typeof general[0] === "string" && general[0]) {
          return general[0];
        }
      }
      const first = Object.values(errors).find((v) => Array.isArray(v) && v.length > 0);
      if (Array.isArray(first) && typeof first[0] === "string" && first[0]) return first[0];
    }
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
    <FileUpload.Root
      :accept="`.xml,${FILE_EXTENSION}`"
      :maxFiles="1"
      :class="fileUploadClasses.root"
      @file-change="(details: { acceptedFiles: File[] }) => {
        const f = details.acceptedFiles[0] ?? null;
        file = f;
        panel.setDirty(Boolean(f) || excludedUsernames.length > 0);
      }"
    >
      <FileUpload.HiddenInput />
      <FileUpload.Label :class="fileUploadClasses.label">Show file</FileUpload.Label>
      <div :class="triggerRow">
        <FileUpload.Trigger asChild>
          <button type="button" :class="button({ variant: 'outline', size: 'sm' })">
            {{ file ? file.name : "Choose file for upload" }}
          </button>
        </FileUpload.Trigger>
        <FileUpload.ClearTrigger v-if="file" asChild>
          <button type="button" :class="button({ variant: 'ghost', size: 'sm' })">
            Clear
          </button>
        </FileUpload.ClearTrigger>
      </div>
    </FileUpload.Root>

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

    <p v-if="importError" :class="errorText">{{ importError }}</p>

    <div :class="actions">
      <button type="button" :class="button({ variant: 'outline' })" @click="panel.close(false)">
        Cancel
      </button>
      <button
        type="button"
        :class="button()"
        :disabled="!file || importPending"
        @click="accept"
      >
        Import
      </button>
    </div>
  </div>
</template>
