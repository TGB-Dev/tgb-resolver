<script setup lang="ts">
import { css } from "@styled-system/css";

import Tooltip from "@/features/shared/ui/tooltip.vue";

const props = defineProps<{
  eventId: number;
  position: number;
}>();

const emit = defineEmits<{
  seek: [id: number];
}>();

function handleClick() {
  emit("seek", props.eventId);
}
</script>

<template>
  <Tooltip
    :content="`Seek to event #${position}`"
    :open-delay="0"
    :positioning="{ placement: 'left', flip: false }"
    show-arrow
  >
    <button
      type="button"
      :class="css({ cursor: 'pointer', fontFamily: 'mono', textAlign: 'end' })"
      @click="handleClick"
    >
      {{ position }}
    </button>
  </Tooltip>
</template>
