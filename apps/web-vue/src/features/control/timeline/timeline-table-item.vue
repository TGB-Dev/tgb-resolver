<script setup lang="ts">
import { Grid } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { extensionRegistry } from "@/features/extensions/registry";
import { useShowStore } from "@/stores/show-store";

defineOptions({ name: "ControlTimelineTableItem" });
const props = defineProps<{ payload: TimelineTableItem; isLive?: boolean }>();
const emit = defineEmits<{ seek: [id: number] }>();
const showStore = useShowStore();
const type = computed(() => props.payload.type === TimelineEventType.CUS ? extensionRegistry.extensionWithExtId(props.payload.extId ?? "")?.shortName ?? "UNK" : props.payload.type);
const position = computed(() => showStore.showOrderedIds.indexOf(props.payload.id) + 1 || props.payload.position);
</script>
<template><Grid templateColumns="5ch 4ch 30ch 5ch 7ch 6ch 10ch 6ch 5ch 3ch" minH="8" alignItems="center" gap="2" px="2" borderBottomWidth="1" :data-event-id="payload.id" @dblclick="emit('seek', payload.id)"><span>{{ position }}</span><span>{{ type }}</span><span>{{ payload.customName || payload.placeholderName }}</span><span>{{ payload.problem || '' }}</span><span>{{ payload.newTotalScore }}</span><span>{{ payload.newRank }}</span><span>{{ payload.durationSeconds ?? '' }}</span><span>{{ payload.triggerOffsetSeconds ?? '' }}</span><span>{{ payload.requireManualInteraction ? '✓' : '' }}</span><span>⋮⋮</span></Grid></template>
