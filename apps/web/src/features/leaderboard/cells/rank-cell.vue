<script setup lang="ts">
import { cva, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

defineProps<{ rank: number }>();

const isBigScreen = computed(() => useLeaderboardStore().isBigScreen);
const fontSizeClass = cva({
  base: { textAlign: "end", fontFamily: "mono" },
  variants: { big: { true: { fontSize: "3xl" } } },
});

const cellClass = computed(() =>
  cx(
    table({ size: isBigScreen.value ? "lg" : "sm", variant: "line" }).cell,
    fontSizeClass({ big: isBigScreen.value }),
  ),
);
</script>

<template>
  <td :class="cellClass">{{ rank }}</td>
</template>
