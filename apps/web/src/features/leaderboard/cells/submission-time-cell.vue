<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

import { formatTime } from "../cells";

const props = defineProps<{ submissionTimeSinceStartSeconds: number }>();

const isBigScreen = computed(() => useLeaderboardStore().isBigScreen);
const cellClass = computed(() =>
  cx(
    table({ size: isBigScreen.value ? "lg" : "sm", variant: "line" }).cell,
    css({
      textAlign: "end",
      fontFamily: "mono",
      fontVariantNumeric: "tabular-nums",
      fontWeight: "bold",
      fontStyle: "italic",
    }),
  ),
);

const formatted = computed(() => formatTime(props.submissionTimeSinceStartSeconds));
</script>

<template>
  <td :class="cellClass">{{ formatted }}</td>
</template>
