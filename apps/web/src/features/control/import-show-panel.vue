<script setup lang="ts">
import { createListCollection, FileUpload, Select } from "@ark-ui/vue";
import { Check, ChevronDown, X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, fileUpload, select as selectRecipe } from "@styled-system/recipes";
import type { ImportXmlUser } from "@tgb-resolver/contracts";
import { FILE_EXTENSION } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

import { useImportShowMutation, useImportXmlUsers } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import { toaster } from "@/features/shared/ui/toaster";

const props = defineProps<{
  panel: FloatingPanelHandle;
}>();

const file = ref<File | null>(null);
const xmlText = ref<string | null>(null);
const excludedUsernames = ref<string[]>([]);
const importShow = useImportShowMutation();

// vue-query's useMutation returns a plain object of refs (unlike useQuery's
// reactive result), so nested state must be unwrapped before template use —
// otherwise `importShow.error` is a truthy Ref object and the error paragraph
// renders "Unknown error" as soon as the dialog opens.
const importError = computed(() =>
  importShow.error.value instanceof Error ? importShow.error.value.message : importShow.error.value,
);
const importPending = computed(() => importShow.isPending.value);

const isXml = computed(() => file.value?.name.toLowerCase().endsWith(".xml") ?? false);
const usersQuery = useImportXmlUsers(() => (isXml.value ? xmlText.value : null));
const allUsers = computed<ImportXmlUser[]>(() => usersQuery.data.value ?? []);

const userItems = computed(() =>
  allUsers.value
    .map((user) => ({ value: user.username ?? "", label: user.username ?? "" }))
    .filter((item) => item.value.length > 0),
);
const collection = computed(() => createListCollection({ items: userItems.value }));

const fileUploadClasses = fileUpload();
const selectClasses = selectRecipe();

const root = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "stretch" });
const triggerRow = css({ display: "flex", gap: "2", marginTop: "2" });
const field = css({ display: "flex", flexDirection: "column", gap: "1" });
const helper = css({ fontSize: "xs", color: "fg.muted" });
const errorText = css({ color: "fg.error", fontSize: "sm" });
const actions = css({ display: "flex", justifyContent: "flex-end", gap: "2", marginTop: "4" });

const userStatus = css({ fontSize: "xs", color: "fg.muted", paddingY: "2" });

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

async function onFileChange(acceptedFiles: File[]): Promise<void> {
  const f = acceptedFiles[0] ?? null;
  file.value = f;
  excludedUsernames.value = [];
  xmlText.value = null;
  if (f?.name.toLowerCase().endsWith(".xml")) {
    xmlText.value = await f.text();
  }
  props.panel.setDirty(Boolean(f));
}

async function accept() {
  if (!file.value) return;

  try {
    await importShow.mutateAsync({
      file: file.value,
      excludedUsernames: excludedUsernames.value,
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
      @file-change="(details: { acceptedFiles: File[] }) => onFileChange(details.acceptedFiles)"
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
          <button
            type="button"
            :class="button({ variant: 'ghost', size: 'sm' })"
            @click="props.panel.setDirty(false)"
          >
            Clear
          </button>
        </FileUpload.ClearTrigger>
      </div>
    </FileUpload.Root>

    <div v-if="isXml" :class="field">
      <!-- <span :class="fieldLabel">Excluded users</span> -->
      <div v-if="usersQuery.isLoading.value" :class="userStatus">Loading users from file…</div>
      <div v-else-if="usersQuery.isError.value" :class="userStatus">
        Could not read users: {{ errorMessage(usersQuery.error.value) }}
      </div>
      <div v-else-if="allUsers.length === 0" :class="userStatus">
        No users found in this XML file.
      </div>
      <Select.Root
        v-else
        :collection="collection"
        :model-value="excludedUsernames"
        :positioning="{ sameWidth: true }" 
        :class="cx(selectClasses.root, css({ w: 'full' }))"
        @value-change="
          (details) => {
            excludedUsernames = details.value;
          }
        "
        multiple
      >
        <Select.Label :class="selectClasses.label">Excluded users</Select.Label>
        <Select.Control :class="selectClasses.control">
          <Select.Trigger :class="selectClasses.trigger">
            <Select.ValueText :class="selectClasses.valueText" placeholder="Select excluded users" />
          </Select.Trigger>
          <div :class="selectClasses.indicatorGroup">
            <Select.ClearTrigger :class="selectClasses.clearTrigger">
              <X :size="16" aria-hidden="true" />
            </Select.ClearTrigger>
            <Select.Indicator :class="selectClasses.indicator">
              <ChevronDown aria-hidden="true" />
            </Select.Indicator>
          </div>
        </Select.Control>
        <Teleport to="body">
          <Select.Positioner :class="selectClasses.positioner">
            <Select.Content :class="selectClasses.content">
              <Select.Item
                v-for="item in collection.items"
                :key="item.value"
                :item="item"
                :class="selectClasses.item"
              >
                <Select.ItemText :class="selectClasses.itemText">{{ item.label }}</Select.ItemText>
                <Select.ItemIndicator :class="selectClasses.itemIndicator">
                  <Check />
                </Select.ItemIndicator>
              </Select.Item>
            </Select.Content>
          </Select.Positioner>
        </Teleport>
      </Select.Root>
      <span :class="helper">
        Select the users to exclude from the show (multiple selections allowed). Applies to XML
        imports only.
      </span>
    </div>

    <p v-if="importError" :class="errorText">{{ importError }}</p>

    <div :class="actions">
      <button type="button" :class="button({ variant: 'outline' })" @click="panel.close(false)">
        Cancel
      </button>
      <button type="button" :class="button()" :disabled="!file || importPending" @click="accept">
        Import
      </button>
    </div>
  </div>
</template>
