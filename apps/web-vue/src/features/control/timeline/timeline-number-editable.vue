<script setup lang="ts">
import { input } from "@styled-system/recipes";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

import { usePatchTimelineEventMutation } from "@/features/control/composables/use-show";

defineOptions({ name: "ControlTimelineNumberEditable" });
const props = defineProps<{ payload: TimelineTableItem; field: "durationSeconds" | "triggerOffsetSeconds"; isNear?: boolean }>();
const patchEvent = usePatchTimelineEventMutation();
const editing = ref(false);
const value = ref("");
const classes = input({ variant: "flushed", size: "2xs" });
const displayValue = computed(() => { const current = props.payload[props.field]; return props.field === "triggerOffsetSeconds" && current != null && current > 0 ? `+${current}` : current ?? ""; });
function startEditing() { value.value = props.payload[props.field] == null ? "" : String(props.payload[props.field]); editing.value = true; }
async function commit() {
  editing.value = false;
  const raw = value.value.trim();
  if (!raw) { await patchEvent.mutateAsync({ eventId: props.payload.id, ...(props.field === "durationSeconds" ? { useDefaultDuration: true } : { clearTriggerOffset: true }) }); return; }
  const next = Number(raw); const current = props.payload[props.field];
  if (!Number.isFinite(next) || (props.field === "durationSeconds" && next < 0) || next === current) return;
  await patchEvent.mutateAsync({ eventId: props.payload.id, [props.field]: next });
}
</script>
<template><input v-if="editing" v-model="value" :class="classes" type="number" @blur="commit" @keydown.enter="commit" @keydown.esc="editing = false" /><button v-else type="button" :class="classes" :aria-label="`Edit ${field}`" @dblclick.stop="startEditing">{{ displayValue }}</button></template>
