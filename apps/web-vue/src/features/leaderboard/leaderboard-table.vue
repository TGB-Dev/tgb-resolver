<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { table } from "@styled-system/recipes";
import type { ProblemDefinition } from "@tgb-resolver/realtime";
import { storeToRefs } from "pinia";
import { computed } from "vue";

import { useLeaderboardStore } from "@/stores/leaderboard-store";

defineProps<{ problems?: ProblemDefinition[] }>();

const { isBigScreen } = storeToRefs(useLeaderboardStore());

const classes = computed(() =>
  table({ size: isBigScreen.value ? "lg" : "sm", variant: "line", stickyHeader: true }),
);
</script>

<template>
  <table
    :class="
      cx(
        classes.root,
        css({
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: isBigScreen ? '2xl' : undefined,
          lineHeight: isBigScreen ? 'tall' : undefined,
        }),
      )
    "
  >
    <thead :class="cx(classes.header, css({ position: 'relative', zIndex: 999 }))">
      <tr :class="classes.row">
        <th :class="cx(classes.columnHeader, css({ textAlign: 'end', borderBottomWidth: 2, borderBottomColor: 'border' }))">
          Rank
        </th>
        <th :class="cx(classes.columnHeader, css({ borderBottomWidth: 2, borderBottomColor: 'border' }))">
          User
        </th>

        <th
          v-for="problem in problems"
          :key="problem.id"
          :class="cx(classes.columnHeader, css({ borderBottomWidth: 2, borderBottomColor: 'border' }))"
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

        <th :class="cx(classes.columnHeader, css({ textAlign: 'end', borderBottomWidth: 2, borderBottomColor: 'border' }))">
          Score
        </th>
        <th :class="cx(classes.columnHeader, css({ textAlign: 'end', borderBottomWidth: 2, borderBottomColor: 'border' }))">
          Penalty
        </th>
        <th :class="cx(classes.columnHeader, css({ textAlign: 'end', borderBottomWidth: 2, borderBottomColor: 'border' }))">
          Time
        </th>
      </tr>
    </thead>
    <tbody :class="classes.body">
      <slot />
    </tbody>
  </table>
</template>
