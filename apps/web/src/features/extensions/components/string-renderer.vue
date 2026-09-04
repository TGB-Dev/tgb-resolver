<script setup lang="ts">
import { Field } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { field as fieldRecipe, input } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";
import { computed } from "vue";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";

const props = defineProps<BaseVueRendererProps>();

const fieldClasses = fieldRecipe();
const currentValue = computed(() =>
  typeof props.field.state.value === "string" ? props.field.state.value : "",
);
const placeholder = computed(() =>
  typeof props.props?.placeholder === "string" ? props.props.placeholder : undefined,
);

function handleInput(event: Event) {
  props.field.handleChange((event.target as HTMLInputElement).value);
}
</script>

<template>
  <Field.Root :class="cx(fieldClasses.root, css({ w: 'full', gap: '1.5' }))">
    <Field.Label v-if="label" :class="fieldClasses.label">{{ label }}</Field.Label>
    <input
      :name="name"
      :class="cx(input(), css({ w: 'full' }))"
      :value="currentValue"
      :placeholder="placeholder"
      @input="handleInput"
      @blur="field.handleBlur()"
    />
    <p v-if="description" :class="fieldClasses.helperText">{{ description }}</p>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(', ') }}
    </p>
  </Field.Root>
</template>
