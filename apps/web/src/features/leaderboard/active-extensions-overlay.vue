<script setup lang="ts">
import { TimelineEventType } from "@tgb-resolver/contracts";
import { AnimatePresence } from "motion-v";
import { computed, onUnmounted, watchEffect } from "vue";

import { usePlaybackStore } from "@/features/control/playback-store";
import { ExtensionType, extensionRegistry, getExtensionPayload } from "@/features/extensions";
import { MotionDiv } from "@/lib/motion-factories";
import { useShowStore } from "@/stores/show-store";

const playback = usePlaybackStore();
const show = useShowStore();
const running = new Map<number, () => void>();

const overlays = computed(() =>
  (show.showFile?.timeline ?? [])
    .filter((event) => playback.state.activeEventIds.includes(event.id))
    .map((event) => {
      const extension = extensionRegistry.extensionWithExtId(
        event.type === TimelineEventType.CUS ? event.payload.extId : "",
      );
      return extension?.type === ExtensionType.WithVueComponent
        ? { id: event.id, component: extension.component, payload: getExtensionPayload(event) ?? {} }
        : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null),
);

watchEffect(() => {
  const active = new Set(playback.state.activeEventIds);
  for (const [id, cleanup] of running) {
    if (!active.has(id)) {
      cleanup();
      running.delete(id);
    }
  }
  for (const event of show.showFile?.timeline ?? []) {
    if (!active.has(event.id) || event.type !== TimelineEventType.CUS || running.has(event.id)) {
      continue;
    }
    const extension = extensionRegistry.extensionWithExtId(event.payload.extId);
    if (extension?.type === ExtensionType.ScriptOnly) {
      const cleanup = extension.execute(event.payload.extPayload ?? {});
      if (typeof cleanup === "function") {
        running.set(event.id, cleanup);
      }
    }
  }
});

onUnmounted(() => {
  for (const cleanup of running.values()) {
    cleanup();
  }
  running.clear();
});
</script>

<template>
  <AnimatePresence mode="sync">
    <MotionDiv
      v-for="overlay in overlays"
      :key="overlay.id"
    >
      <component :is="overlay.component" :payload="overlay.payload" />
    </MotionDiv>
  </AnimatePresence>
</template>
