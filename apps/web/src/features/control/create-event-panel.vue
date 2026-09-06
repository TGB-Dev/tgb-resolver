<script setup lang="ts">
import {
  Combobox,
  Field,
  useFilter,
  useListCollection,
} from "@ark-ui/vue";
import { Check, ChevronDown } from "@lucide/vue";
import { css } from "@styled-system/css";
import { button, combobox } from "@styled-system/recipes";
import { computed, ref, useTemplateRef } from "vue";

import { useAssetsManagerStore } from "@/features/assets-manager/assets-manager-store";
import { useCreateTimelineEventMutation } from "@/features/control/composables/use-show";
import type { FloatingPanelHandle } from "@/features/control/floating-panel-types";
import type { Extension } from "@/features/extensions/base/types";
import ExtensionConfigForm from "@/features/extensions/extension-config-form.vue";
import { extensionRegistry } from "@/features/extensions/registry";
import { extensionRendererRegistry } from "@/features/extensions/renderers";
import { computeScrollerExtensionDuration } from "@/features/extensions/scroller/duration";
import { parseErrorMessage } from "@/features/shared/ui/error-message";
import Spinner from "@/features/shared/ui/spinner.vue";

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
const configFormRef = useTemplateRef<InstanceType<typeof ExtensionConfigForm>>("configFormRef");
const error = ref<string | null>(null);
const comboboxClasses = combobox();

const createProps = computed(
  () =>
    props.panel.props.value as {
      relativeToEventId: number;
      before: boolean;
    },
);

function setSelectedExtension(items: Extension[]) {
  selectedExtension.value = items[0] ?? null;
}

async function handleCreate() {
  if (!selectedExtension.value) return;
  const ext = selectedExtension.value;
  error.value = null;
  props.panel.setSaving(true);

  try {
    const values = configFormRef.value?.getValues() ?? {};
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
    error.value = parseErrorMessage(err);
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
    <Field.Root>
      <Combobox.Root
        :collection="collection"
        :open-on-click="true"
        input-behavior="autohighlight"
        :class="comboboxClasses.root"
        @input-value-change="(details: { inputValue: string }) => filter(details.inputValue)"
        @value-change="(details: { items: Extension[] }) => setSelectedExtension(details.items)"
      >
        <Combobox.Label :class="comboboxClasses.label">Extension</Combobox.Label>
        <Combobox.Control :class="comboboxClasses.control">
          <Combobox.Input :class="comboboxClasses.input" placeholder="Choose an extension" />
          <div :class="comboboxClasses.indicatorGroup">
            <Combobox.Trigger :class="comboboxClasses.trigger">
              <ChevronDown aria-hidden="true" />
            </Combobox.Trigger>
          </div>
        </Combobox.Control>
        <Combobox.Positioner position="fixed" :class="comboboxClasses.positioner">
          <Combobox.Content :class="comboboxClasses.content">
            <Combobox.List :class="comboboxClasses.list">
              <Combobox.Item
                v-for="ext in collection.items"
                :key="ext.extId"
                :item="ext"
                :class="comboboxClasses.item"
              >
                <Combobox.ItemText :class="comboboxClasses.itemText">
                  {{ ext.shortName }} - {{ ext.description }}
                </Combobox.ItemText>
                <Combobox.ItemIndicator :class="comboboxClasses.itemIndicator">
                  <Check aria-hidden="true" />
                </Combobox.ItemIndicator>
              </Combobox.Item>
            </Combobox.List>
            <Combobox.Empty :class="comboboxClasses.empty">No extensions found.</Combobox.Empty>
          </Combobox.Content>
        </Combobox.Positioner>
      </Combobox.Root>
    </Field.Root>

    <template v-if="selectedExtension?.configForm">
      <ExtensionConfigForm
        :key="selectedExtension.extId"
        ref="configFormRef"
        :definition="selectedExtension.configForm"
        :baseline="{}"
        :renderers="extensionRendererRegistry"
      />
      <div :class="row">
        <button type="button" :class="button({ variant: 'outline' })" @click="panel.requestClose()">
          Cancel
        </button>
        <button
          type="button"
          :class="button()"
          :disabled="panel.isSaving.value"
          @click="handleCreate"
        >
          <Spinner v-if="panel.isSaving.value" size="inherit" label="" aria-hidden="true" />
          Create
        </button>
      </div>
      <p v-if="error" :class="errorText">
        {{ error }}
      </p>
    </template>
  </div>
</template>
