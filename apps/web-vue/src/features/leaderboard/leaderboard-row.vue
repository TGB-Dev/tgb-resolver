<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";
import { table } from "@styled-system/recipes";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { formatTime } from "./cells";
import ProblemCell from "./problem-cell.vue";

defineOptions({ name: "LeaderboardRow" });

const props = defineProps<{
  data: LeaderboardEntry;
  isCurrentResolved: boolean;
}>();

const classes = table({ size: "md", variant: "line", stickyHeader: true });

const submissionTimeSinceStartSeconds = computed(() =>
  Math.max(
    ...props.data.problems.map((p) => p.timeSinceStart),
    props.data.lastSubmittedSeconds ?? 0,
    0,
  ),
);

const formattedTime = computed(() =>
  formatTime(submissionTimeSinceStartSeconds.value),
);
</script>

<template>
  <tr
    :class="classes.row"
    :data-current="isCurrentResolved || undefined"
    :style="{
      backgroundColor: isCurrentResolved ? 'var(--colors-yellow-700, #b45309)' : undefined,
    }"
  >
    <td :class="classes.cell" style="text-align: end; font-family: var(--fonts-mono);">
      {{ data.rank }}
    </td>

    <td :class="classes.cell" style="max-width: 30ch;">
      <VStack alignItems="start" gap="1">
        <Box fontWeight="medium">{{ data.realName }}</Box>
        <Box fontFamily="mono" fontStyle="italic" fontSize="xs" color="fg.muted">
          {{ data.username }}
        </Box>
      </VStack>
    </td>

    <ProblemCell
      v-for="problem in data.problems"
      :key="problem.problemId"
      :problem="problem"
    />

    <td :class="classes.cell" style="text-align: end; font-family: var(--fonts-mono);">
      {{ data.totalScore }}
    </td>

    <td :class="classes.cell" style="text-align: end; font-family: var(--fonts-mono);">
      {{ data.totalPenalty }}
    </td>

    <td
      :class="classes.cell"
      style="text-align: end; font-family: var(--fonts-mono); font-weight: bold; font-style: italic;"
    >
      {{ formattedTime }}
    </td>
  </tr>
</template>
