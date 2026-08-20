<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { computed } from "vue";

defineOptions({ name: "TimelineEventPosition" });

const props = defineProps<{
  eventId: number;
  position: number;
}>();

const emit = defineEmits<{
  seek: [id: number];
}>();

const formattedPosition = computed(() => `#${props.position}`);
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
    {{ formattedPosition }}
  </Box>
</template>
