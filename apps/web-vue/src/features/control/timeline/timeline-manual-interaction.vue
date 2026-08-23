<script setup lang="ts">
import { Check } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { inject, ref } from "vue";

import { usePatchTimelineEventMutation } from "@/features/control/composables/use-show";
import Tooltip from "@/features/shared/ui/tooltip.vue";

import { timelineRowHoverKey } from "./timeline-row-hover";

const props = defineProps<{
  payload: TimelineTableItem;
}>();

const patchEvent = usePatchTimelineEventMutation();
const isNear = inject(timelineRowHoverKey, ref(false));

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
    <button
      type="button"
      aria-label="Toggle manual interaction"
      :class="
        cx(
          button({ variant: 'ghost' }),
          iconButton(),
          css({ minW: 0, w: 'full', h: 6, m: 1, aspectRatio: 'auto' }),
        )
      "
      @dblclick="toggle"
    >
      <Check
        v-if="payload.requireManualInteraction"
        :size="14"
        aria-hidden
      />
    </button>
  </Tooltip>
</template>
