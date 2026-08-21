<script setup lang="ts">
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { motion } from "motion-v";
import { computed, onMounted, ref, watch } from "vue";

import { TgbResolverEasings } from "@/features/shared/anim/easings";
import { useColorModeStore } from "@/stores/color-mode-store";
import { useLeaderboardStore } from "@/stores/leaderboard-store";

import PenaltyCell from "./cells/penalty-cell.vue";
import RankCell from "./cells/rank-cell.vue";
import ScoreCell from "./cells/score-cell.vue";
import SubmissionTimeCell from "./cells/submission-time-cell.vue";
import UsernameCell from "./cells/username-cell.vue";
import ProblemCell from "./problem-cell.vue";
import { animateScrollIntoView } from "./utils/scroll";

const MotionTr = motion.create("tr");

const props = defineProps<{ data: LeaderboardEntry; isCurrentResolved: boolean }>();

const rowRef = ref<HTMLTableRowElement | null>(null);
const leaderboardStore = useLeaderboardStore();
const colorModeStore = useColorModeStore();

const submissionTimeSinceStartSeconds = computed(() =>
  Math.max(
    ...props.data.problems.map((p) => p.timeSinceStart),
    props.data.lastSubmittedSeconds ?? 0,
    0,
  ),
);

const isDark = computed(() => colorModeStore.colorMode === "dark");
const animateBg = computed(() =>
  props.isCurrentResolved ? (isDark.value ? "yellow.700" : "yellow.300") : "bg",
);

const transition = {
  layout: { duration: 0.8, ease: TgbResolverEasings.inOutQuad },
  backgroundColor: { duration: 0.15, ease: TgbResolverEasings.inOutQuad },
};

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
  <MotionTr
    ref="rowRef"
    :style="{ position: 'relative', zIndex: isCurrentResolved ? 5 : 0 }"
    layout="position"
    :layout-scroll="true"
    :animate="{ backgroundColor: animateBg }"
    :transition="transition"
  >
    <RankCell :rank="data.rank" />

    <UsernameCell :real-name="data.realName" :username="data.username" />

    <ProblemCell v-for="problem in data.problems" :key="problem.problemId" :problem="problem" />

    <ScoreCell :score="data.totalScore" />
    <PenaltyCell :penalty="data.totalPenalty" />

    <SubmissionTimeCell :submission-time-since-start-seconds="submissionTimeSinceStartSeconds" />
  </MotionTr>
</template>
