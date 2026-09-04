<script setup lang="ts">
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { usePatchTimelineEventMutation } from "@/features/control/composables/use-show";

import TimelineCellEditable from "./timeline-cell-editable.vue";

const props = defineProps<{
  payload: TimelineTableItem;
  field: "durationSeconds" | "triggerOffsetSeconds";
}>();

const patchEvent = usePatchTimelineEventMutation();
const current = computed(() => props.payload[props.field]);

// Only the trigger offset shows an explicit sign on preview; durations are
// always non-negative and read as-is.
const displayValue = computed(() => {
  const val = current.value;
  if (val == null) return "";
  return props.field === "triggerOffsetSeconds" && val > 0 ? `+${val}` : String(val);
});

function handleBlankCommit() {
  patchEvent.mutate({
    eventId: props.payload.id,
    ...(props.field === "durationSeconds"
      ? { useDefaultDuration: true }
      : { clearTriggerOffset: true }),
  });
}

function handleCommit(value: string) {
  const normalizedValue = value.trim();
  const next = Number(normalizedValue);
  if (
    Number.isFinite(next) &&
    (props.field !== "durationSeconds" || next >= 0) &&
    next !== current.value
  ) {
    patchEvent.mutate({ eventId: props.payload.id, [props.field]: next });
  }
}
</script>

<template>
  <TimelineCellEditable
    :value="current == null ? '' : String(current)"
    :display-value="displayValue"
    text-align="end"
    font-family="mono"
    @commit="handleCommit"
    @blank-commit="handleBlankCommit"
  />
</template>
