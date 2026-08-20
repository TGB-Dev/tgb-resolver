<script setup lang="ts">
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { verdictShortCode } from "@/lib/verdict";

const props = defineProps<{
  cue: TimelineTableItem;
  fg: string;
  contentSize: string;
  nameOverride?: string;
}>();

const resolvedName = props.cue.customName ?? props.nameOverride ?? props.cue.name;
const hasOld =
  props.cue.oldScore !== undefined &&
  props.cue.oldRank !== undefined &&
  props.cue.newTotalScore !== undefined &&
  props.cue.newRank !== undefined;
const rankImprovement =
  props.cue.oldRank !== undefined && props.cue.newRank !== undefined
    ? props.cue.oldRank - props.cue.newRank
    : 0;

function tokenToCssVar(token: string): string {
  return `var(--colors-${token.replace(/\./g, "-")})`;
}
</script>

<template>
  <span v-if="!cue.problem" class="tgb-resolve-line">{{ resolvedName }}</span>
  <span v-else>
    {{ resolvedName }} |
    <span :style="{ color: tokenToCssVar(fg), fontFamily: 'var(--fonts-mono)' }">
      {{ verdictShortCode(cue.verdict) }}
    </span>
    <span> | </span>
    <span class="tgb-resolve-success">
      {{ cue.problem }}. {{ cue.problemDisplayName }}
      <template v-if="cue.newProblemScore !== undefined"> ({{ cue.newProblemScore }} PTS)</template>
    </span>
    <template v-if="hasOld">
      <span> | Total </span>
      <span class="tgb-resolve-mono">{{ cue.oldScore }}</span>
      <span> to </span>
      <span class="tgb-resolve-success">{{ cue.newTotalScore }}</span>
      <span> | Rank </span>
      <span class="tgb-resolve-mono">{{ cue.oldRank }}</span>
      <span> to </span>
      <span class="tgb-resolve-success">{{ cue.newRank }}</span>
      <template v-if="rankImprovement > 0"> (+{{ rankImprovement }})</template>
    </template>
  </span>
</template>

<style scoped>
.tgb-resolve-line,
.tgb-resolve-mono {
  font-family: var(--fonts-mono);
  font-size: inherit;
}

.tgb-resolve-success {
  font-family: var(--fonts-mono);
  font-size: inherit;
  color: var(--colors-fg-success);
}
</style>