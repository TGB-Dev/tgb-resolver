<script setup lang="ts">
import { css } from "@styled-system/css";

defineProps<{
  eventId: number;
  position: number;
}>();

const emit = defineEmits<{
  seek: [id: number];
}>();
</script>

<template>
  <button
    type="button"
    :class="css({ cursor: 'pointer', fontFamily: 'mono', textAlign: 'end', color: 'fg.muted', _hover: { color: 'fg' } })"
    @dblclick.stop="emit('seek', eventId)"
  >
    {{ position }}
  </button>
</template>
