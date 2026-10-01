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

const props = defineProps<{ data: LeaderboardEntry; isCurrentResolved: boolean; flip?: boolean }>();

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
// the active color mode. Rows are virtualized with fixed heights (44px
// standard, 76px big-screen) matching the parent virtualizer estimate, so
// translate offsets stay exact. The transform transition powers
// TransitionGroup FLIP on rank swaps and is only enabled via `flip` in the
// unvirtualized path: in virtual mode the inline virtual translate changes
// every scroll frame, and a transform transition would make rows trail.
const rowClass = css({
  position: "relative",
  zIndex: 0,
  height: "11",
  backgroundColor: "bg",
  transitionProperty: "background-color",
  transitionDuration: "0.15s",
  transitionTimingFunction: "inOutQuad",
  '&[data-current="true"]': {
    zIndex: 5,
    backgroundColor: "yellow.300",
    _dark: { backgroundColor: "yellow.700" },
  },
  '&[data-big="true"]': { height: "19" },
  '&[data-flip="true"]': {
    transitionProperty: "transform, background-color",
    transitionDuration: "0.8s, 0.15s",
  },
});
</script>

<template>
  <tr
    :data-user-id="data.userId"
    :data-current="isCurrentResolved"
    :data-big="leaderboardStore.isBigScreen"
    :data-flip="flip"
    :class="rowClass"
  >
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
