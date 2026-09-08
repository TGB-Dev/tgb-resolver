<script setup lang="ts">
import { inject } from "vue";

import { SplitterContextKey } from "./context";

defineProps<{ disabled?: boolean }>();

const ctx = inject(SplitterContextKey);
</script>

<template>
  <div
    data-scope="splitter"
    data-part="resize-trigger-indicator"
    data-orientation="horizontal"
    :data-ownedby="ctx?.rootId"
  >
    <slot />
  </div>
</template>
