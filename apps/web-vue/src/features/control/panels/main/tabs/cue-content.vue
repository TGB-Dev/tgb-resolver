<script setup lang="ts">
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
  <span v-if="!cue" class="tgb-cue-muted">-</span>

  <span v-else-if="cue.type === TimelineEventType.RES">
    <span class="tgb-cue-muted">RES</span>
    <span> | </span>
    <ResolveContent :cue="cue" :fg="fg" :content-size="contentSize" />
  </span>

  <span v-else-if="cue.type === TimelineEventType.PRE">
    <span class="tgb-cue-muted">PRE-RES</span>
    <span> | </span>
    <ResolveContent :cue="cue" :fg="fg" :content-size="contentSize" :name-override="teamName(cue)" />
  </span>

  <span v-else-if="cue.type === TimelineEventType.CUS && extensionRegistry.extensionWithExtId(cue.extId ?? '')" class="tgb-cue-line">
    {{ cue.customName ?? cue.name }}
  </span>

  <span v-else class="tgb-cue-line">{{ cue.customName ?? cue.name }}</span>
</template>

<style scoped>
.tgb-cue-muted {
  color: var(--colors-fg-muted);
  font-family: var(--fonts-mono);
  font-size: inherit;
}

.tgb-cue-line {
  font-family: var(--fonts-mono);
  font-size: inherit;
}
</style>