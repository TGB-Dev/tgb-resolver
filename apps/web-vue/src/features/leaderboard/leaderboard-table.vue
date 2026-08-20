<script setup lang="ts">
import { table } from "@styled-system/recipes";
import type { ProblemDefinition } from "@tgb-resolver/realtime";

defineOptions({ name: "LeaderboardTable" });
defineProps<{ problems?: ProblemDefinition[] }>();
const classes = table({ size: "md", variant: "line", stickyHeader: true });
</script>
<template><table :class="classes.root"><thead :class="classes.header"><tr :class="classes.row"><th :class="classes.columnHeader">Rank</th><th :class="classes.columnHeader">User</th><th v-for="problem in problems" :key="problem.id" :class="classes.columnHeader">{{ problem.label }}</th><th :class="classes.columnHeader">Score</th><th :class="classes.columnHeader">Penalty</th><th :class="classes.columnHeader">Time</th></tr></thead><tbody :class="classes.body"><slot /></tbody></table></template>
