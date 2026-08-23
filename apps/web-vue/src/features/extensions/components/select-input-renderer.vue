<script setup lang="ts">
import { Field, useListCollection } from "@ark-ui/vue";
import { Check, ChevronDown } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { field as fieldRecipe } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";
import { computed } from "vue";

import {
  SelectContent,
  SelectControl,
  SelectHiddenSelect,
  SelectIndicator,
  SelectIndicatorGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectList,
  SelectPositioner,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from "@/features/shared/ui/select";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";

interface SelectOption {
  value: string;
  label: string;
}

const props = defineProps<BaseVueRendererProps>();

const fieldClasses = fieldRecipe();

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

const { collection } = useListCollection({ initialItems: options.value });

const value = computed(() =>
  typeof props.field.state.value === "string" ? props.field.state.value : "",
);
const selectedValues = computed(() => (value.value ? [value.value] : []));

function handleValueChange(details: { value: string[] }) {
  props.field.handleChange(details.value[0] ?? "");
}
</script>

<template>
  <Field.Root :class="css({ w: 'full' })">
    <Field.Label v-if="label" :class="fieldClasses.label">{{ label }}</Field.Label>
    <SelectRoot :collection="collection" :value="selectedValues" @value-change="handleValueChange">
      <SelectHiddenSelect />
      <SelectControl>
        <SelectTrigger>
          <SelectValueText placeholder="Select an option" />
        </SelectTrigger>
        <SelectIndicatorGroup>
          <SelectIndicator>
            <ChevronDown aria-hidden="true" />
          </SelectIndicator>
        </SelectIndicatorGroup>
      </SelectControl>
      <SelectPositioner>
        <SelectContent>
          <SelectList>
            <SelectItem
              v-for="option in collection.items"
              :key="option.value"
              :item="option"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator>
                <Check aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectList>
        </SelectContent>
      </SelectPositioner>
    </SelectRoot>
    <p v-if="description" :class="fieldClasses.helperText">{{ description }}</p>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(', ') }}
    </p>
  </Field.Root>
</template>
