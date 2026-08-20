<script setup lang="ts">
import { Box, Center, Grid } from "@styled-system/jsx";
import { table } from "@styled-system/recipes";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import { computed, inject, type Ref } from "vue";

defineOptions({ name: "LeaderboardTable" });

defineProps<{
  problems?: ProblemDefinition[];
}>();

const isBigScreen = inject<Ref<boolean>>("isBigScreen", computed(() => false));
const classes = computed(() =>
  table({
    size: isBigScreen.value ? "lg" : "sm",
    variant: "line",
    stickyHeader: true,
  }),
);
</script>

<template>
  <table
    :class="classes.root"
    :style="{
      borderCollapse: 'separate',
      borderSpacing: 0,
      fontSize: isBigScreen ? 'var(--font-sizes-2xl)' : undefined,
    }"
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
          :style="{
            width: isBigScreen ? '14rem' : '8ch',
            height: '2rem',
          }"
        >
          <Grid v-if="isBigScreen" templateRows="1fr 2fr" h="full" gap="2">
            <Center>
              <Box fontFamily="mono">{{ problem.label }}</Box>
            </Center>
            <Box textAlign="center" maxW="full" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {{ problem.name }}
            </Box>
          </Grid>
          <Center v-else>
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
