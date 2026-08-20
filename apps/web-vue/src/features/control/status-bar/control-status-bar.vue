<script setup lang="ts">
import { Grid, HStack } from "@styled-system/jsx";

import ControlCurrentTime from "@/features/control/status-bar/control-current-time.vue";
import ControlElapsedTime from "@/features/control/status-bar/control-elapsed-time.vue";
import ControlFullScreenButton from "@/features/control/status-bar/control-full-screen-button.vue";
import Button from "@/features/shared/ui/button.vue";
import ColorModeButton from "@/features/shared/ui/color-mode-button.vue";
</script>

<template>
  <Grid templateColumns="1fr auto 1fr" h="16" px="2" borderBottomWidth="1" alignItems="center">
    <HStack h="full">
      <ControlFullScreenButton />
      <ControlCurrentTime />
    </HStack>
    <ControlElapsedTime />
    <HStack justifyContent="flex-end" h="full">
      <Button variant="outline">
        <a href="/" target="_blank" rel="noopener noreferrer">Open audience view (new tab)</a>
      </Button>
      <ColorModeButton />
    </HStack>
  </Grid>
</template>
