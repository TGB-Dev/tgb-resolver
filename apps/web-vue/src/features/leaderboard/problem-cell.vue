<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { problemCell } from "@styled-system/recipes";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { verdictShortCode } from "@/lib/verdict";
import { useLeaderboardStore } from "@/stores/leaderboard-store";

const props = defineProps<{ problem: LeaderboardProblemResult }>();

const isBigScreen = computed(() => useLeaderboardStore().isBigScreen);

type ProblemCellVerdict =
  | "accepted"
  | "wrongAnswer"
  | "timeLimitExceeded"
  | "memoryLimitExceeded"
  | "outputLimitExceeded"
  | "invalidReturn"
  | "runtimeError"
  | "compileError"
  | "internalError"
  | "shortCircuited"
  | "aborted"
  | "pending"
  | "unknown"
  | "unresolved";

const VERDICT_VARIANT: Record<VerdictRunResult, ProblemCellVerdict> = {
  [VerdictRunResult.UNKNOWN]: "unknown",
  [VerdictRunResult.ACCEPTED]: "accepted",
  [VerdictRunResult.WRONG_ANSWER]: "wrongAnswer",
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: "timeLimitExceeded",
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: "memoryLimitExceeded",
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: "outputLimitExceeded",
  [VerdictRunResult.INVALID_RETURN]: "invalidReturn",
  [VerdictRunResult.RUNTIME_ERROR]: "runtimeError",
  [VerdictRunResult.COMPILE_ERROR]: "compileError",
  [VerdictRunResult.INTERNAL_ERROR]: "internalError",
  [VerdictRunResult.SHORT_CIRCUITED]: "shortCircuited",
  [VerdictRunResult.ABORTED]: "aborted",
  [VerdictRunResult.PENDING]: "pending",
  [VerdictRunResult.UNRESOLVED]: "unresolved",
};

const classes = computed(() =>
  problemCell({ verdict: VERDICT_VARIANT[props.problem.verdict] ?? "pending" }),
);

const isUnknown = computed(() => props.problem.verdict === VerdictRunResult.UNKNOWN);
const score = computed(() => (isUnknown.value ? " " : props.problem.score));

const verdictClass = computed(() =>
  cx(classes.value.verdict, isBigScreen.value ? css({ fontSize: "md" }) : undefined),
);
</script>

<template>
  <td :class="css({ paddingInline: '0.25rem' })">
    <div :class="classes.root">
      <div :class="classes.score" :style="{ lineHeight: '1.3', whiteSpaceCollapse: 'preserve' }">
        {{ score }}
      </div>
      <div :class="verdictClass" :style="{ lineHeight: '1.2', whiteSpaceCollapse: 'preserve' }">
        {{ verdictShortCode(problem.verdict) }}
      </div>
    </div>
  </td>
</template>
