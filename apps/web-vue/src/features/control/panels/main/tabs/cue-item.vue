<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";

import { CUE_CONFIG, type Cue } from "./cue";

defineOptions({ name: "CueItem" });
const props = defineProps<{ cue: Cue }>();
</script>

<template>
  <VStack gap="4" alignItems="start">
    <Box :fontSize="CUE_CONFIG[props.cue].headingSize" fontWeight="bold">
      {{ CUE_CONFIG[props.cue].label }}
    </Box>
    <Box
      as="span"
      :fontSize="CUE_CONFIG[props.cue].contentSize"
      fontFamily="mono"
      textTransform="uppercase"
      overflowWrap="break-word"
      lineHeight="1.6"
    >
      <slot />
    </Box>
  </VStack>
</template>
