<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { computed, inject, type Ref } from "vue";

import { useVerdictColor, verdictShortCode } from "@/lib/verdict";

const props = defineProps<{
  problem: LeaderboardProblemResult;
}>();

const isBigScreen = inject<Ref<boolean>>("isBigScreen", computed(() => false));

const isPending = computed(() => props.problem.verdict === VerdictRunResult.PENDING);
const isUnknown = computed(() => props.problem.verdict === VerdictRunResult.UNKNOWN);
const isUnresolved = computed(() => props.problem.verdict === VerdictRunResult.UNRESOLVED);

const verdictColors = computed(() => useVerdictColor(props.problem.verdict));
const scoreFg = computed(() => (isUnresolved.value || isPending.value ? verdictColors.value.fg : undefined));
const score = computed(() => (isUnknown.value ? " " : props.problem.score));
</script>

<template>
  <Box
    as="td"
    px="1"
    textAlign="center"
  >
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      borderWidth="2"
      rounded="sm"
      px="1.5"
      py="0.5"
      textAlign="center"
      :borderColor="verdictColors.border"
      :bg="verdictColors.bg"
      :style="{
        animation: isPending ? 'pulse 2s cubic-bezier(0.45, 0, 0.55, 1) infinite' : undefined,
      }"
    >
      <Box
        lineHeight="1.3"
        fontFamily="mono"
        :color="scoreFg"
        whiteSpace="pre"
      >
        {{ score }}
      </Box>
      <Box
        :fontSize="isBigScreen ? 'md' : 'xs'"
        lineHeight="1.2"
        :color="verdictColors.fg"
        whiteSpace="pre"
      >
        {{ verdictShortCode(problem.verdict) }}
      </Box>
    </Box>
  </Box>
</template>
