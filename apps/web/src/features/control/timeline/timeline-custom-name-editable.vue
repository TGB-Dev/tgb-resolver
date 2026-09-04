<script setup lang="ts">
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { useRenameControlEventMutation } from "@/features/control/composables/use-show";

import TimelineCellEditable from "./timeline-cell-editable.vue";

const props = defineProps<{
  payload: TimelineTableItem;
}>();

const renameEvent = useRenameControlEventMutation();
const currentName = computed(() => props.payload.customName ?? "");

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

function handleCommit(value: string) {
  const customName = value.trim();
  if (customName !== currentName.value.trim()) {
    renameEvent.mutate({ eventId: props.payload.id, type: props.payload.type, customName });
  }
}
</script>

<template>
  <TimelineCellEditable
    :value="currentName"
    :display-value="resolveDisplayName(payload)"
    :placeholder="payload.placeholderName"
    text-align="start"
    @commit="handleCommit"
  />
</template>
