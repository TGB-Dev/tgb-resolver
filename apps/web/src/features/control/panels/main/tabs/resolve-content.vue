<script setup lang="ts">
import { css } from "@styled-system/css";
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
</script>

<template>
  <span v-if="!cue.problem" :class="css({ fontFamily: 'mono' })">{{ resolvedName }}</span>
  <span v-else :class="css({ fontFamily: 'mono' })">
    {{ resolvedName }} |
    <span :class="css({ color: fg })">
      {{ verdictShortCode(cue.verdict) }}
    </span>
    <span> | </span>
    <span :class="css({ color: 'fg.success' })">
      {{ cue.problem }}. {{ cue.problemDisplayName }}
      <template v-if="cue.newProblemScore !== undefined"> ({{ cue.newProblemScore }} PTS)</template>
    </span>
    <template v-if="hasOld">
      <span> | Total </span>
      <span>{{ cue.oldScore }}</span>
      <span> to </span>
      <span :class="css({ color: 'fg.success' })">{{ cue.newTotalScore }}</span>
      <span> | Rank </span>
      <span>{{ cue.oldRank }}</span>
      <span> to </span>
      <span :class="css({ color: 'fg.success' })">{{ cue.newRank }}</span>
      <template v-if="rankImprovement > 0"> (+{{ rankImprovement }})</template>
    </template>
  </span>
</template>
