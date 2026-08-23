<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { problemCell } from "@styled-system/recipes";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { verdictShortCode } from "@/lib/verdict";
import { useLeaderboardStore } from "@/stores/leaderboard-store";

const props = defineProps<{
  problem: LeaderboardProblemResult;
  /** True for the problem cell of the most recent PRE/RES event. */
  isLatestResolved?: boolean;
}>();

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

/** Border tone per resolved verdict (drives which blink keyframes apply). */
type ResolvedBorderTone = "success" | "error" | "warning" | "muted";

const RESOLVED_TONE: Partial<Record<VerdictRunResult, ResolvedBorderTone>> = {
  [VerdictRunResult.ACCEPTED]: "success",
  [VerdictRunResult.WRONG_ANSWER]: "error",
  [VerdictRunResult.INVALID_RETURN]: "error",
  [VerdictRunResult.RUNTIME_ERROR]: "error",
  [VerdictRunResult.ABORTED]: "error",
  [VerdictRunResult.TIME_LIMIT_EXCEEDED]: "warning",
  [VerdictRunResult.MEMORY_LIMIT_EXCEEDED]: "warning",
  [VerdictRunResult.OUTPUT_LIMIT_EXCEEDED]: "warning",
  [VerdictRunResult.COMPILE_ERROR]: "warning",
  [VerdictRunResult.INTERNAL_ERROR]: "warning",
  [VerdictRunResult.SHORT_CIRCUITED]: "muted",
};

// Literal css() calls — Panda's extractor cannot emit utilities built from
// dynamic values, so each tone's blink is precompiled here.
const BLINK_CLASS: Record<ResolvedBorderTone, string> = {
  success: css({ animation: "resolvedBlinkSuccess" }),
  error: css({ animation: "resolvedBlinkError" }),
  warning: css({ animation: "resolvedBlinkWarning" }),
  muted: css({ animation: "resolvedBlinkMuted" }),
};

const classes = computed(() =>
  problemCell({ verdict: VERDICT_VARIANT[props.problem.verdict] ?? "pending" }),
);

const isUnknown = computed(() => props.problem.verdict === VerdictRunResult.UNKNOWN);
const score = computed(() => (isUnknown.value ? " " : props.problem.score));

// Only the latest resolved cell blinks — and only when its verdict maps to a
// border tone to blink against.
const blinkClass = computed(() => {
  if (!props.isLatestResolved) return undefined;
  const tone = RESOLVED_TONE[props.problem.verdict];
  return tone ? BLINK_CLASS[tone] : undefined;
});

const verdictClass = computed(() =>
  cx(classes.value.verdict, isBigScreen.value ? css({ fontSize: "md" }) : undefined),
);
</script>

<template>
  <td :class="css({ paddingInline: '0.25rem' })">
    <div :class="cx(classes.root, blinkClass)">
      <div :class="classes.score" :style="{ lineHeight: '1.3', whiteSpaceCollapse: 'preserve' }">
        {{ score }}
      </div>
      <div :class="verdictClass" :style="{ lineHeight: '1.2', whiteSpaceCollapse: 'preserve' }">
        {{ verdictShortCode(problem.verdict) }}
      </div>
    </div>
  </td>
</template>
