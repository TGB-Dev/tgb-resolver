<script setup lang="ts">
import {
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxItemText,
  ComboboxLabel,
  ComboboxPositioner,
  ComboboxRoot,
  ComboboxTrigger,
  FieldRoot,
  useFilter,
  useListCollection,
} from "@ark-ui/vue";
import { css } from "@styled-system/css";
import { combobox } from "@styled-system/recipes";
import { TgbForm } from "@tgb-form/vue";
import { computed, ref, watch } from "vue";

import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";
import { useCreateTimelineEventMutation } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import type { Extension } from "@/features/extensions/base/types";
import { extensionRegistry } from "@/features/extensions/registry";
import { extensionRendererRegistry } from "@/features/extensions/renderers";
import { computeScrollerExtensionDuration } from "@/features/extensions/scroller/duration";
import { createTgbFormInstance } from "@/features/extensions/tgb-form-instance";
import Button from "@/features/shared/ui/button.vue";

const props = defineProps<{
  panel: FloatingPanelHandle;
}>();

const createTimelineEvent = useCreateTimelineEventMutation();
const assetsStore = useAssetsManagerStore();

const extensions = extensionRegistry.extensionList.filter((extension: Extension) => Boolean(extension.configForm));
const filterRef = useFilter({ sensitivity: "base" });
const { collection, filter } = useListCollection<Extension>({
  initialItems: extensions,
  filter: (itemText: string, filterText: string) => filterRef.value.contains(itemText, filterText),
  itemToString: (extension: Extension) => `${extension.shortName} - ${extension.description}`,
  itemToValue: (extension: Extension) => extension.extId,
});

const selectedExtension = ref<Extension | null>(null);

function setSelectedExtension(items: Extension[]) {
  selectedExtension.value = items[0] ?? null;
}

const formInstance = ref(createTgbFormInstance({}));
const error = ref<string | null>(null);
const comboboxClasses = combobox();

const createProps = computed(
  () =>
    props.panel.props.value as {
      relativeToEventId: number;
      before: boolean;
    },
);

watch(selectedExtension, (ext) => {
  if (ext?.configForm) {
    formInstance.value = createTgbFormInstance({});
  }
});

async function handleCreate() {
  if (!selectedExtension.value) return;
  const ext = selectedExtension.value;
  error.value = null;
  props.panel.setSaving(true);

  try {
    const values = formInstance.value.values;
    let durationSeconds: number | undefined;
    if (ext.extId === "scroller") {
      durationSeconds = computeScrollerExtensionDuration(values);
    }

    const customName =
      (ext.extId === "image" || ext.extId === "media") && typeof values.assetId === "string"
        ? assetsStore.findEntryName(values.assetId)
        : undefined;

    await createTimelineEvent.mutateAsync({
      relativeToEventId: createProps.value.relativeToEventId,
      before: createProps.value.before,
      customName,
      durationSeconds,
      custom: { extId: ext.extId, extPayload: { ...values } },
    });
    props.panel.close(true);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    props.panel.setSaving(false);
  }
}

const stack = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "stretch", h: "full" });
const row = css({ display: "flex", justifyContent: "flex-end", gap: "2", marginTop: "4" });
const errorText = css({ color: "fg.error", fontSize: "sm" });
</script>

<template>
  <div :class="stack">
    <FieldRoot>
      <ComboboxRoot
        :collection="collection"
        :open-on-click="true"
        input-behavior="autohighlight"
        :class="comboboxClasses.root"
        @input-value-change="(details: { inputValue: string }) => filter(details.inputValue)"
        @value-change="(details: { items: Extension[] }) => setSelectedExtension(details.items)"
      >
        <ComboboxLabel :class="comboboxClasses.label">Extension</ComboboxLabel>
        <ComboboxControl :class="comboboxClasses.control">
          <ComboboxInput :class="comboboxClasses.input" placeholder="Choose an extension" />
          <ComboboxTrigger :class="comboboxClasses.trigger">▼</ComboboxTrigger>
        </ComboboxControl>
        <ComboboxPositioner position="fixed" :class="comboboxClasses.positioner">
          <ComboboxContent :class="comboboxClasses.content">
            <ComboboxEmpty :class="comboboxClasses.empty">No extensions found.</ComboboxEmpty>
            <ComboboxItem
              v-for="ext in collection.items"
              :key="ext.extId"
              :item="ext"
              :class="comboboxClasses.item"
            >
              <ComboboxItemText :class="comboboxClasses.itemText">
                {{ ext.shortName }} - {{ ext.description }}
              </ComboboxItemText>
              <ComboboxItemIndicator :class="comboboxClasses.itemIndicator">✓</ComboboxItemIndicator>
            </ComboboxItem>
          </ComboboxContent>
        </ComboboxPositioner>
      </ComboboxRoot>
    </FieldRoot>

    <template v-if="selectedExtension?.configForm">
      <TgbForm
        :definition="selectedExtension.configForm"
        :instance="formInstance.values"
        :renderers="extensionRendererRegistry"
      />
      <div :class="row">
        <Button variant="outline" @click="panel.requestClose()">
          Cancel
        </Button>
        <Button
          :loading="panel.isSaving.value"
          @click="handleCreate"
        >
          Create
        </Button>
      </div>
      <p v-if="error" :class="errorText">
        {{ error }}
      </p>
    </template>
  </div>
</template>
