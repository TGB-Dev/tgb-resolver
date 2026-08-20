<script setup lang="ts">
import { Box } from "@styled-system/jsx";
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
  <Box v-if="!cue.problem" as="span" fontFamily="mono">{{ resolvedName }}</Box>
  <Box v-else as="span" fontFamily="mono">
    {{ resolvedName }} |
    <Box as="span" :color="fg">
      {{ verdictShortCode(cue.verdict) }}
    </Box>
    <span> | </span>
    <Box as="span" color="fg.success">
      {{ cue.problem }}. {{ cue.problemDisplayName }}
      <template v-if="cue.newProblemScore !== undefined"> ({{ cue.newProblemScore }} PTS)</template>
    </Box>
    <template v-if="hasOld">
      <span> | Total </span>
      <Box as="span">{{ cue.oldScore }}</Box>
      <span> to </span>
      <Box as="span" color="fg.success">{{ cue.newTotalScore }}</Box>
      <span> | Rank </span>
      <Box as="span">{{ cue.oldRank }}</Box>
      <span> to </span>
      <Box as="span" color="fg.success">{{ cue.newRank }}</Box>
      <template v-if="rankImprovement > 0"> (+{{ rankImprovement }})</template>
    </template>
  </Box>
</template>
