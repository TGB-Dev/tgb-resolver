<script setup lang="ts">
import type { ProblemDefinition } from "@tgb-resolver/realtime";

defineOptions({ name: "LeaderboardTable" });
defineProps<{ problems?: ProblemDefinition[] }>();
</script>
<template><table><thead><tr><th>Rank</th><th>User</th><th v-for="problem in problems" :key="problem.id">{{ problem.label }}</th><th>Score</th><th>Penalty</th><th>Time</th></tr></thead><tbody><slot /></tbody></table></template>
