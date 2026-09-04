<script setup lang="ts">
import { css } from "@styled-system/css";
import { useForm, useSelector } from "@tanstack/vue-form";
import { getDefaultValues, type RuntimeFormDefinition, toValibotSchema } from "@tgb-form/core";
import { TgbForm, type VueRendererRegistry } from "@tgb-form/vue";

import { toTgbFormInstance } from "./tgb-form-instance";

const props = defineProps<{
  definition: RuntimeFormDefinition;
  /** Restored payload values; merged over the definition defaults. */
  baseline?: Record<string, unknown>;
  renderers: VueRendererRegistry;
  onSubmit?: (values: Record<string, unknown>) => void | Promise<void>;
}>();

function unwrapRestoredValue(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  if (!isRecord(value)) return value;
  const record = value;
  if (Object.keys(record).length === 1 && "value" in record)
    return unwrapRestoredValue(record.value);
  return value;
}

function isRecord(value: object): value is Record<string, unknown> {
  return Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null;
}

function restoredPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) return {};
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, unwrapRestoredValue(value)]),
  );
}

// Seeds once at setup - the Vue equivalent of React's useMemo([configForm,
// event]) baseline. The parent mounts this component only when the event and
// its payload are available, so the values are final at this point.
const initialValues: Record<string, unknown> = {
  ...getDefaultValues(props.definition),
  ...restoredPayload(props.baseline),
};

const form = useForm({
  defaultValues: initialValues,
  validators: {
    onSubmit: toValibotSchema(props.definition) as never,
  },
  onSubmit: async ({ value }: { value: Record<string, unknown> }) => {
    await props.onSubmit?.(value);
  },
});

const instance = toTgbFormInstance(form);

const isDirty = useSelector(
  form.store,
  (state) => JSON.stringify(state.values) !== JSON.stringify(initialValues),
);
const canSubmit = useSelector(form.store, (state) => state.canSubmit);

const formClasses = css({ gap: "1rem", display: "flex", flexDirection: "column" });

defineExpose({
  getValues: () => form.state.values as Record<string, unknown>,
  isDirty: () => isDirty.value,
  canSubmit: () => canSubmit.value,
  submit: () => form.handleSubmit(),
});
</script>

<template>
  <TgbForm :definition="definition" :instance="instance" :renderers="renderers" :class="formClasses" />
</template>
