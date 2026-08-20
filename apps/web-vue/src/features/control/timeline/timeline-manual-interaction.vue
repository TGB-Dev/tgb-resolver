<script setup lang="ts">
import { Check } from "@lucide/vue";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { usePatchTimelineEventMutation } from "@/features/control/composables/use-show";
import IconButton from "@/features/shared/ui/icon-button.vue";

const props = withDefaults(
  defineProps<{
    payload: TimelineTableItem;
    isNear?: boolean;
  }>(),
  { isNear: false },
);

const patchEvent = usePatchTimelineEventMutation();

function toggle(event: MouseEvent) {
  event.stopPropagation();
  patchEvent.mutate({
    eventId: props.payload.id,
    requireManualInteraction: !props.payload.requireManualInteraction,
  });
}
</script>

<template>
  <Check
    v-if="!isNear && payload.requireManualInteraction"
    :size="14"
    aria-hidden
  />
  <IconButton
    v-else-if="isNear"
    size="2xs"
    ariaLabel="Toggle manual interaction"
    @dblclick="toggle"
  >
    <Check
      v-if="payload.requireManualInteraction"
      :size="14"
      aria-hidden
    />
  </IconButton>
</template>
