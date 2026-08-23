<script setup lang="ts">
import { css } from "@styled-system/css";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

import PenaltyCell from "./cells/penalty-cell.vue";
import RankCell from "./cells/rank-cell.vue";
import ScoreCell from "./cells/score-cell.vue";
import SubmissionTimeCell from "./cells/submission-time-cell.vue";
import UsernameCell from "./cells/username-cell.vue";
import ProblemCell from "./problem-cell.vue";

const props = defineProps<{ data: LeaderboardEntry; isCurrentResolved: boolean }>();

const leaderboardStore = useLeaderboardStore();

const submissionTimeSinceStartSeconds = computed(() =>
  Math.max(
    ...props.data.problems.map((p) => p.timeSinceStart),
    props.data.lastSubmittedSeconds ?? 0,
  ),
);

// Only the problem cell of the most recent PRE/RES event blinks.
function isLatestResolved(problemId: number): boolean {
  const latest = leaderboardStore.latestResolved;
  return (
    latest !== null && latest.userId === props.data.userId && latest.problemId === problemId
  );
}

// Background stays CSS-owned (token + _dark condition) so it always matches
// the active color mode. The transform transition powers TransitionGroup's
// FLIP on rank swaps; it lives HERE (utilities layer) because a global
// `.leaderboard-row-move` rule would be overridden by this element's own
// background-color transition utility. Per-property durations: transform
// follows the 0.8s rank-swap feel, background keeps its quick 0.15s fade.
const rowClass = computed(() =>
  css({
    position: "relative",
    zIndex: props.isCurrentResolved ? 5 : 0,
    backgroundColor: props.isCurrentResolved
      ? { base: "yellow.300", _dark: "yellow.700" }
      : "bg",
    transitionProperty: "transform, background-color",
    transitionDuration: "0.8s, 0.15s",
    transitionTimingFunction: "inOutQuad",
  }),
);
</script>

<template>
  <tr :data-user-id="data.userId" :class="rowClass">
    <RankCell :rank="data.rank" />

    <UsernameCell :real-name="data.realName" :username="data.username" />

    <ProblemCell
      v-for="problem in data.problems"
      :key="problem.problemId"
      :problem="problem"
      :is-latest-resolved="isLatestResolved(problem.problemId)"
    />

    <ScoreCell :score="data.totalScore" />
    <PenaltyCell :penalty="data.totalPenalty" />

    <SubmissionTimeCell :submission-time-since-start-seconds="submissionTimeSinceStartSeconds" />
  </tr>
</template>
