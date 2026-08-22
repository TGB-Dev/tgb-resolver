<script setup lang="ts">
import { Check } from "@lucide/vue";
import { css } from "@styled-system/css";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { usePatchTimelineEventMutation } from "@/features/control/composables/use-show";
import IconButton from "@/features/shared/ui/icon-button.vue";
import Tooltip from "@/features/shared/ui/tooltip.vue";

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
  <Tooltip
    v-else-if="isNear"
    content="Double-click to toggle manual interaction"
    :open-delay="0"
  >
    <IconButton
      size="2xs"
      variant="ghost"
      ariaLabel="Toggle manual interaction"
      :class="css({ minW: 0, w: 'full', h: 6, m: 1, aspectRatio: 'auto' })"
      @dblclick="toggle"
    >
      <Check
        v-if="payload.requireManualInteraction"
        :size="14"
        aria-hidden
      />
    </IconButton>
  </Tooltip>
</template>
