<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

defineProps<{ username: string; realName: string }>();

const isBigScreen = computed(() => useLeaderboardStore().isBigScreen);
const cellClass = computed(() =>
  cx(
    table({ size: isBigScreen.value ? "lg" : "sm", variant: "line" }).cell,
    css({ maxWidth: "30ch" }),
  ),
);

function usernameClass() {
  return css({
    fontFamily: "mono",
    fontStyle: "italic",
  });
}
</script>

<template>
  <td :class="cellClass">
    <div :class="css({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 })">
      <div>{{ realName }}</div>
      <div :class="usernameClass()">{{ username }}</div>
    </div>
  </td>
</template>
