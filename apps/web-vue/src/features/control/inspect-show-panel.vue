<script setup lang="ts">
import { Box } from "@styled-system/jsx";

defineOptions({ name: "InspectShowPanel" });
defineProps<{ title?: string; details?: string }>();
</script>
<template><Box p="4"><h2>{{ title ?? 'Show details' }}</h2><pre>{{ details ?? 'No details available' }}</pre></Box></template>
