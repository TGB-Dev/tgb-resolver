<script setup lang="ts">
import { createListCollection, Field, Select } from "@ark-ui/vue";
import { Check } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { field as fieldRecipe, select as selectRecipe } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";
import { computed } from "vue";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";

interface SelectOption {
  value: string;
  label: string;
}

const props = defineProps<BaseVueRendererProps>();

const fieldClasses = fieldRecipe();
const selectClasses = selectRecipe();

const options = computed<SelectOption[]>(() =>
  Array.isArray(props.props?.options)
    ? (props.props.options as unknown[]).filter(
        (option): option is SelectOption =>
          typeof option === "object" &&
          option !== null &&
          typeof (option as SelectOption).value === "string" &&
          typeof (option as SelectOption).label === "string",
      )
    : [],
);

// Rebuilt whenever options change so the machine always sees current items.
const collection = computed(() => createListCollection({ items: options.value }));

const selectedValues = computed(() => {
  const value = props.field.state.value;
  return typeof value === "string" && value ? [value] : [];
});

function handleValueChange(details: { value: string[] }) {
  props.field.handleChange(details.value[0] ?? "");
}
</script>

<template>
  <Field.Root :class="cx(fieldClasses.root, css({ w: 'full', gap: '1.5' }))">
    <Select.Root
      :collection="collection"
      :model-value="selectedValues"
      :positioning="{ sameWidth: true }"
      :class="cx(selectClasses.root, css({ w: 'full' }))"
      @value-change="handleValueChange"
    >
      <Select.Label v-if="label" :class="selectClasses.label">{{ label }}</Select.Label>
      <Select.Trigger :class="selectClasses.trigger">
        <Select.ValueText placeholder="Select an option" :class="selectClasses.valueText" />
      </Select.Trigger>
      <Teleport to="body">
        <Select.Positioner :class="selectClasses.positioner">
          <Select.Content :class="selectClasses.content">
            <Select.Item
              v-for="option in collection.items"
              :key="option.value"
              :item="option"
              :class="selectClasses.item"
            >
              <Select.ItemText :class="selectClasses.itemText">{{ option.label }}</Select.ItemText>
              <Select.ItemIndicator :class="selectClasses.itemIndicator">
                <Check />
              </Select.ItemIndicator>
            </Select.Item>
          </Select.Content>
        </Select.Positioner>
      </Teleport>
    </Select.Root>
    <p v-if="description" :class="fieldClasses.helperText">{{ description }}</p>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(", ") }}
    </p>
  </Field.Root>
</template>
