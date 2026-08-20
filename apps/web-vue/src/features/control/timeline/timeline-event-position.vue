<script setup lang="ts">
import { Box } from "@styled-system/jsx";

defineProps<{
  eventId: number;
  position: number;
}>();

const emit = defineEmits<{
  seek: [id: number];
}>();
</script>

<template>
  <Box
    cursor="pointer"
    fontFamily="mono"
    textAlign="end"
    color="fg.muted"
    :_hover="{ color: 'fg' }"
    @dblclick.stop="emit('seek', eventId)"
  >
    {{ position }}
  </Box>
</template>
