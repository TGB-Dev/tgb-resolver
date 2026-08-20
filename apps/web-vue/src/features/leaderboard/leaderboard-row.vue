<script setup lang="ts">
import { Box, VStack } from "@styled-system/jsx";
import { table } from "@styled-system/recipes";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed, inject, onMounted, type Ref, ref, watch } from "vue";

import { TgbResolverEasings } from "@/features/shared/anim/easings";

import { formatTime } from "./cells";
import { useLeaderboardStore } from "./leaderboard-store";
import ProblemCell from "./problem-cell.vue";
import { animateScrollIntoView } from "./utils/scroll";

const props = defineProps<{
  data: LeaderboardEntry;
  isCurrentResolved: boolean;
}>();

const rowRef = ref<HTMLTableRowElement | null>(null);
const leaderboardStore = useLeaderboardStore();
const isBigScreen = inject<Ref<boolean>>("isBigScreen", computed(() => false));
const classes = computed(() => table({ size: isBigScreen.value ? "lg" : "md", variant: "line", stickyHeader: true }));

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

function checkAndScroll() {
  const targetId = leaderboardStore.currentBottomView;
  if (targetId !== props.data.userId || !rowRef.value) return;

  requestAnimationFrame(() => {
    if (!rowRef.value) return;
    let parent: HTMLElement | null = rowRef.value.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (
        style.overflow === "auto" ||
        style.overflow === "scroll" ||
        style.overflowY === "auto" ||
        style.overflowY === "scroll"
      ) {
        animateScrollIntoView(rowRef.value, parent, {
          block: "end",
          duration: 0.8,
          ease: TgbResolverEasings.inOutQuad,
        });
        return;
      }
      parent = parent.parentElement;
    }
  });
}

watch(() => leaderboardStore.currentBottomView, checkAndScroll);
onMounted(checkAndScroll);
</script>

<template>
  <tr
    ref="rowRef"
    :class="classes.row"
    :data-current="isCurrentResolved || undefined"
    :style="{
      position: 'relative',
      zIndex: isCurrentResolved ? 5 : 0,
      backgroundColor: isCurrentResolved ? 'var(--colors-yellow-700, #b45309)' : undefined,
      transition: 'background-color 0.15s cubic-bezier(0.45, 0, 0.55, 1)',
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
