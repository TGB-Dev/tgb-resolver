<script setup lang="ts">
import type { FsEntry } from "./types";

defineOptions({ name: "EntryCard" });
defineProps<{ entry: FsEntry }>();
</script>
<template><div :data-entry-id="entry.id">{{ entry.name }}</div></template>
