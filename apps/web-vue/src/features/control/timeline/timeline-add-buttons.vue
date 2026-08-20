<script setup lang="ts">
import { Plus } from "@lucide/vue";
import { Box } from "@styled-system/jsx";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useCreateTimelineEventMutation } from "@/features/control/composables/use-show";
import UiIconButton from "@/features/shared/ui/icon-button.vue";

defineOptions({ name: "ControlTimelineAddButtons" });
const props = defineProps<{ payload: TimelineTableItem; isNear: boolean }>();
const createEvent = useCreateTimelineEventMutation();
async function create(before: boolean) {
  await createEvent.mutateAsync({ relativeToEventId: props.payload.id, before, custom: { extId: "blank", extPayload: {} } });
}
</script>
<template><Box v-if="isNear" position="absolute" right="0" top="0" bottom="0" display="flex" flexDirection="column" justifyContent="space-between" zIndex="popover"><UiIconButton size="2xs" ariaLabel="Add event before" @click.stop="create(true)"><Plus :size="12" aria-hidden /></UiIconButton><UiIconButton size="2xs" ariaLabel="Add event after" @click.stop="create(false)"><Plus :size="12" aria-hidden /></UiIconButton></Box></template>
