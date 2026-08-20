<script setup lang="ts">
import { Box } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useExtensionRegistry } from "@/features/extensions/registry";
import { useVerdictColor } from "@/lib/verdict";

import ResolveContent from "./resolve-content.vue";

const props = defineProps<{
  cue: TimelineTableItem | undefined;
  contentSize: string;
}>();

const extensionRegistry = useExtensionRegistry();
const { fg } = useVerdictColor(props.cue?.verdict);

function teamName(cue: TimelineTableItem): string {
  return cue.realName ?? cue.username ?? cue.name;
}
</script>

<template>
  <Box v-if="!cue" as="span" color="fg.muted" fontFamily="mono">-</Box>

  <span v-else-if="cue.type === TimelineEventType.RES">
    <Box as="span" color="fg.muted" fontFamily="mono">RES</Box>
    <span> | </span>
    <ResolveContent :cue="cue" :fg="fg" :content-size="contentSize" />
  </span>

  <span v-else-if="cue.type === TimelineEventType.PRE">
    <Box as="span" color="fg.muted" fontFamily="mono">PRE-RES</Box>
    <span> | </span>
    <ResolveContent :cue="cue" :fg="fg" :content-size="contentSize" :name-override="teamName(cue)" />
  </span>

  <Box v-else-if="cue.type === TimelineEventType.CUS && extensionRegistry.extensionWithExtId(cue.extId ?? '')" as="span" fontFamily="mono">
    {{ cue.customName ?? cue.name }}
  </Box>

  <Box v-else as="span" fontFamily="mono">{{ cue.customName ?? cue.name }}</Box>
</template>
