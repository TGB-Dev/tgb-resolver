<script setup lang="ts">
import { Box } from "@styled-system/jsx";

import Leaderboard from "@/features/leaderboard/leaderboard.vue";

defineOptions({ name: "ControlMainPreviewTab" });
</script>

<template>
  <Box h="full" overflowY="auto">
    <Leaderboard />
  </Box>
</template>
