<script setup lang="ts">
import { css, cva, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import { storeToRefs } from "pinia";
import { computed, TransitionGroup } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

defineProps<{ problems?: ProblemDefinition[]; totalSize?: number }>();

const { isBigScreen } = storeToRefs(useLeaderboardStore());

const classes = computed(() =>
  table({ size: isBigScreen.value ? "lg" : "sm", variant: "line", stickyHeader: true }),
);

const tableClass = cva({
  base: { borderCollapse: "collapse", borderSpacing: 0 },
  variants: { big: { true: { fontSize: "2xl", lineHeight: "tall" } } },
});
const headerCellClass = css({ borderBottomWidth: 2, borderBottomColor: "border" });
const headerCellEndClass = css({
  textAlign: "end",
  borderBottomWidth: 2,
  borderBottomColor: "border",
});
</script>

<template>
  <div :style="totalSize != null ? { height: `${totalSize}px` } : undefined">
    <table
      :class="cx(classes.root, tableClass({ big: isBigScreen }))"
    >
    <thead :class="cx(classes.header, css({ position: 'relative', zIndex: 999 }))">
      <tr :class="classes.row">
        <th :class="cx(classes.columnHeader, headerCellEndClass)">
          Rank
        </th>
        <th :class="cx(classes.columnHeader, headerCellClass)">
          User
        </th>

        <th
          v-for="problem in problems"
          :key="problem.id"
          :class="cx(classes.columnHeader, headerCellClass)"
          :style="{ width: isBigScreen ? '14rem' : '8ch', height: '2rem' }"
        >
          <div
            v-if="isBigScreen"
            :class="css({ display: 'grid', gridTemplateRows: '1fr 2fr', height: 'full', gap: 2 })"
          >
            <div :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center' })">
              <span :class="css({ fontFamily: 'mono' })">{{ problem.label }}</span>
            </div>
            <div :class="css({ textAlign: 'center', overflow: 'hidden', lineClamp: 2 })">
              {{ problem.name }}
            </div>
          </div>
          <div v-else :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center' })">
            <span :class="css({ fontFamily: 'mono' })">{{ problem.label }}</span>
          </div>
        </th>

        <th :class="cx(classes.columnHeader, headerCellEndClass)">
          Score
        </th>
        <th :class="cx(classes.columnHeader, headerCellEndClass)">
          Penalty
        </th>
        <th :class="cx(classes.columnHeader, headerCellEndClass)">
          Time
        </th>
      </tr>
    </thead>
    <!-- Unvirtualized (totalSize == null): TransitionGroup FLIP-animates rows
      on rank swaps. Virtualized: rows are windowed, so a plain tbody is used
      and the parent applies per-row translate (FLIP transform would collide
      with the virtual translate). -->
    <TransitionGroup
      v-if="totalSize == null"
      tag="tbody"
      name="leaderboard-row"
      :class="classes.body"
    >
      <slot />
    </TransitionGroup>
    <tbody v-else :class="classes.body">
      <slot />
    </tbody>
    </table>
  </div>
</template>
