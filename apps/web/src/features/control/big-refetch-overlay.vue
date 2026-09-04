<script setup lang="ts">
import { css } from "@styled-system/css";

import Spinner from "@/features/shared/ui/spinner.vue";
import { useRealtimeStore } from "@/stores/realtime-store";

const realtimeStore = useRealtimeStore();

const overlay = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bg: "blackAlpha.700",
  zIndex: "toast",
});
const stack = css({ display: "flex", flexDirection: "column", gap: "4", alignItems: "center" });
const label = css({ color: "fg.muted", fontSize: "sm" });
</script>

<template>
  <div v-if="realtimeStore.bigRefetching" :class="overlay">
    <div :class="stack">
      <Spinner size="xl" label="" aria-hidden="true" />
      <p :class="label">Syncing show…</p>
    </div>
  </div>
</template>
