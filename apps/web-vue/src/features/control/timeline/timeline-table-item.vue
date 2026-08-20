<script setup lang="ts">
import { Grid } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { extensionRegistry } from "@/features/extensions/registry";
import { useShowStore } from "@/stores/show-store";

import CurrentEventIndicator from "./current-event-indicator.vue";
import { timelineTableGridTemplateColumns } from "./timeline-table-column-config";

defineOptions({ name: "ControlTimelineTableItem" });
const props = defineProps<{ payload: TimelineTableItem; isLive?: boolean }>();
const emit = defineEmits<{ seek: [id: number] }>();
const showStore = useShowStore();
const type = computed(() => props.payload.type === TimelineEventType.CUS ? extensionRegistry.extensionWithExtId(props.payload.extId ?? "")?.shortName ?? "UNK" : props.payload.type);
const position = computed(() => showStore.showOrderedIds.indexOf(props.payload.id) + 1 || props.payload.position);
</script>
<template><Grid :templateColumns="timelineTableGridTemplateColumns" minH="8" alignItems="center" gap="2" px="2" borderBottomWidth="1" position="relative" :data-event-id="payload.id" @dblclick="emit('seek', payload.id)"><CurrentEventIndicator :event-id="payload.id" :duration-in-seconds="payload.durationSeconds" /><span>{{ position }}</span><span>{{ type }}</span><span>{{ payload.customName || payload.placeholderName }}</span><span>{{ payload.problem || '' }}</span><span>{{ payload.newTotalScore }}</span><span>{{ payload.newRank }}</span><span>{{ payload.durationSeconds ?? '' }}</span><span>{{ payload.triggerOffsetSeconds ?? '' }}</span><span>{{ payload.requireManualInteraction ? '✓' : '' }}</span><span>⋮⋮</span></Grid></template>
