<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

defineProps<{ rank: number }>();

const isBigScreen = computed(() => useLeaderboardStore().isBigScreen);
const cellClass = computed(() =>
  cx(
    table({ size: isBigScreen.value ? "lg" : "sm", variant: "line" }).cell,
    css({
      textAlign: "end",
      fontFamily: "mono",
      '&[data-big="true"]': { fontSize: "3xl" },
    }),
  ),
);
</script>

<template>
  <td :data-big="isBigScreen" :class="cellClass">{{ rank }}</td>
</template>
