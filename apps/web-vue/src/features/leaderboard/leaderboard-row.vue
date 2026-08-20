<script setup lang="ts">
import { table } from "@styled-system/recipes";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { computed } from "vue";

defineOptions({ name: "LeaderboardRow" });
const props = defineProps<{ data: LeaderboardEntry; isCurrentResolved: boolean }>();
const classes = table({ size: "md", variant: "line", stickyHeader: true });
const time = computed(() => { const total = Math.floor(Math.max(...props.data.problems.map((problem) => problem.timeSinceStart), props.data.lastSubmittedSeconds ?? 0, 0)); return `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`; });
function score(problem: LeaderboardEntry["problems"][number]) { return problem.verdict === VerdictRunResult.UNKNOWN ? " " : problem.score; }
</script>
<template><tr :class="classes.row" :data-current="isCurrentResolved || undefined"><td :class="classes.cell">{{ data.rank }}</td><td :class="classes.cell"><strong>{{ data.realName }}</strong><em>{{ data.username }}</em></td><td v-for="problem in data.problems" :key="problem.problemId" :class="classes.cell"><span>{{ score(problem) }}</span><small>{{ problem.verdict }}</small></td><td :class="classes.cell">{{ data.totalScore }}</td><td :class="classes.cell">{{ data.totalPenalty }}</td><td :class="classes.cell">{{ time }}</td></tr></template>
