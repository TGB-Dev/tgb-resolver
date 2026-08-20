<script setup lang="ts">
import { Box, Center } from "@styled-system/jsx";
import { table } from "@styled-system/recipes";
import type { ProblemDefinition } from "@tgb-resolver/realtime";

defineOptions({ name: "LeaderboardTable" });

defineProps<{
  problems?: ProblemDefinition[];
}>();

const classes = table({ size: "md", variant: "line", stickyHeader: true });
</script>

<template>
  <table
    :class="classes.root"
    style="border-collapse: separate; border-spacing: 0;"
  >
    <thead
      :class="classes.header"
      style="position: relative; z-index: 50;"
    >
      <tr :class="classes.row">
        <th :class="classes.columnHeader" style="text-align: end;">Rank</th>
        <th :class="classes.columnHeader">User</th>

        <th
          v-for="problem in problems"
          :key="problem.id"
          :class="classes.columnHeader"
          style="width: 8ch; height: 2rem;"
        >
          <Center>
            <Box fontFamily="mono">{{ problem.label }}</Box>
          </Center>
        </th>

        <th :class="classes.columnHeader" style="text-align: end;">Score</th>
        <th :class="classes.columnHeader" style="text-align: end;">Penalty</th>
        <th :class="classes.columnHeader" style="text-align: end;">Time</th>
      </tr>
    </thead>
    <tbody :class="classes.body">
      <slot />
    </tbody>
  </table>
</template>
