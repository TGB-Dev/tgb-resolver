<script setup lang="ts">
import { Checkbox, FieldRoot } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { checkbox, field as fieldRecipe } from "@styled-system/recipes";
import type { BaseVueRendererProps } from "@tgb-form/vue";

import { fieldErrorTextCss, validationErrorMessage } from "./field-error";

const props = defineProps<BaseVueRendererProps>();

const checkboxClasses = checkbox();
const fieldClasses = fieldRecipe();

function handleCheckedChange(details: { checked: boolean | "indeterminate" }) {
  if (typeof details.checked === "boolean") props.field.handleChange(details.checked);
}
</script>

<template>
  <FieldRoot :class="cx(fieldClasses.root, css({ w: 'full' }))">
    <Checkbox.Root
      :class="checkboxClasses.root"
      :checked="Boolean(field.state.value)"
      @checked-change="handleCheckedChange"
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control :class="checkboxClasses.control" />
      <Checkbox.Label v-if="label" :class="checkboxClasses.label">{{ label }}</Checkbox.Label>
    </Checkbox.Root>
    <p v-if="errors.length > 0" :class="cx(fieldClasses.errorText, fieldErrorTextCss)">
      {{ errors.map(validationErrorMessage).join(', ') }}
    </p>
  </FieldRoot>
</template>
