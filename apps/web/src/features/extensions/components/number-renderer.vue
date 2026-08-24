<script setup lang="ts">
import { Field, NumberInput } from "@ark-ui/vue";
import { ChevronDown, ChevronUp } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { field as fieldRecipe, numberInput } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";
import { computed } from "vue";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";

const props = defineProps<BaseVueRendererProps>();

const fieldClasses = fieldRecipe();
const numberInputClasses = numberInput();

const currentValue = computed(() =>
  typeof props.field.state.value === "number" ? String(props.field.state.value) : "",
);
const min = computed(() => (typeof props.props?.min === "number" ? props.props.min : undefined));
const max = computed(() => (typeof props.props?.max === "number" ? props.props.max : undefined));
const step = computed(() => (typeof props.props?.step === "number" ? props.props.step : 1));

function handleValueChange(details: { value: string; valueAsNumber: number }) {
  if (Number.isFinite(details.valueAsNumber)) props.field.handleChange(details.valueAsNumber);
}
</script>

<template>
  <Field.Root :class="cx(fieldClasses.root, css({ w: 'full', gap: '1.5' }))">
    <Field.Label v-if="label" :class="fieldClasses.label">{{ label }}</Field.Label>
    <NumberInput.Root
      :class="cx(numberInputClasses.root, css({ w: 'full' }))"
      :model-value="currentValue"
      :min="min"
      :max="max"
      :step="step"
      @value-change="handleValueChange"
    >
      <NumberInput.Input :class="numberInputClasses.input" />
      <NumberInput.Control :class="numberInputClasses.control">
        <NumberInput.IncrementTrigger :class="numberInputClasses.incrementTrigger">
          <ChevronUp :size="16" aria-hidden="true" />
        </NumberInput.IncrementTrigger>
        <NumberInput.DecrementTrigger :class="numberInputClasses.decrementTrigger">
          <ChevronDown :size="16" aria-hidden="true" />
        </NumberInput.DecrementTrigger>
      </NumberInput.Control>
    </NumberInput.Root>
    <p v-if="description" :class="fieldClasses.helperText">{{ description }}</p>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(', ') }}
    </p>
  </Field.Root>
</template>
