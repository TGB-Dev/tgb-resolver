<script setup lang="ts">
import { GripVertical } from "@lucide/vue";
import { Box } from "@styled-system/jsx";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { extensionRegistry } from "@/features/extensions/registry";
import GridTableRow from "@/features/shared/ui/grid-table-row.vue";
import UiIconButton from "@/features/shared/ui/icon-button.vue";
import { useShowStore } from "@/stores/show-store";

import CurrentEventIndicator from "./current-event-indicator.vue";
import TimelineAddButtons from "./timeline-add-buttons.vue";
import TimelineCustomNameEditable from "./timeline-custom-name-editable.vue";
import TimelineEventPosition from "./timeline-event-position.vue";
import TimelineManualInteraction from "./timeline-manual-interaction.vue";
import TimelineNumberEditable from "./timeline-number-editable.vue";
import {
  timelineTableGridTemplateColumns,
  timelineTableGridTemplateColumnsStatic,
} from "./timeline-table-column-config";

defineOptions({ name: "ControlTimelineTableItem" });

const props = defineProps<{
  payload: TimelineTableItem;
  isLive?: boolean;
}>();

const emit = defineEmits<{
  seek: [id: number];
  contextmenu: [event: MouseEvent, payload: TimelineTableItem];
}>();

const showStore = useShowStore();
const floatingPanelStore = useFloatingPanelStore();
const isNear = ref(false);

const isReorderable = computed(
  () => props.payload.type === TimelineEventType.CUS && !props.isLive,
);

const templateColumns = computed(() =>
  props.isLive
    ? timelineTableGridTemplateColumnsStatic
    : timelineTableGridTemplateColumns,
);

const type = computed(() =>
  props.payload.type === TimelineEventType.CUS
    ? extensionRegistry.extensionWithExtId(props.payload.extId ?? "")?.shortName ?? "UNK"
    : props.payload.type,
);

const position = computed(
  () =>
    showStore.showOrderedIds.indexOf(props.payload.id) + 1 ||
    props.payload.position,
);

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

function handleDoubleClick() {
  if (props.payload.type === TimelineEventType.CUS) {
    floatingPanelStore.openFloatingPanel(
      FloatingPanelType.ExtensionConfig,
      `Edit Event #${position.value}`,
      { eventId: props.payload.id },
    );
  }
}
</script>

<template>
  <Box
    w="full"
    minH="8"
    position="relative"
    borderBottomWidth="1"
    borderColor="border"
    :data-event-id="payload.id"
    :data-current="isLive || undefined"
    @pointerenter="isNear = true"
    @pointerleave="isNear = false"
    @contextmenu="emit('contextmenu', $event, payload)"
    @dblclick="handleDoubleClick"
  >
    <CurrentEventIndicator
      :event-id="payload.id"
      :duration-in-seconds="payload.durationSeconds"
    />

    <GridTableRow :templateColumns="templateColumns" px="2">
      <TimelineEventPosition
        :event-id="payload.id"
        :position="position"
        @seek="emit('seek', $event)"
      />

      <Box fontFamily="mono" textTransform="uppercase">
        {{ type }}
      </Box>

      <Box minW="0">
        <TimelineCustomNameEditable
          v-if="!isLive"
          :payload="payload"
        />
        <Box v-else>
          {{ resolveDisplayName(payload) }}
        </Box>
      </Box>

      <Box fontFamily="mono" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
        {{ payload.problem ?? "" }}
        <template v-if="payload.problem && payload.newProblemScore !== undefined">
          ({{ payload.newProblemScore }})
        </template>
      </Box>

      <Box textAlign="end" fontFamily="mono">
        {{ payload.newTotalScore ?? "" }}
      </Box>

      <Box textAlign="end" fontFamily="mono">
        {{ payload.newRank ?? "" }}
      </Box>

      <TimelineNumberEditable
        v-if="!isLive"
        :payload="payload"
        field="durationSeconds"
      />
      <Box v-else textAlign="end" fontFamily="mono">
        {{ payload.durationSeconds ?? "" }}
      </Box>

      <TimelineNumberEditable
        v-if="!isLive"
        :payload="payload"
        field="triggerOffsetSeconds"
      />
      <Box v-else textAlign="end" fontFamily="mono">
        {{
          payload.triggerOffsetSeconds != null && payload.triggerOffsetSeconds > 0
            ? `+${payload.triggerOffsetSeconds}`
            : ""
        }}
      </Box>

      <Box display="flex" alignItems="center" justifyContent="center" h="6">
        <TimelineManualInteraction
          :payload="payload"
          :is-near="isNear"
        />
      </Box>

      <Box
        v-if="!isLive"
        display="flex"
        alignItems="center"
        justifyContent="center"
        h="full"
      >
        <UiIconButton
          ariaLabel="Drag to reorder event"
          size="2xs"
          variant="ghost"
          :disabled="!isReorderable"
          :cursor="isReorderable ? 'grab' : 'not-allowed'"
          color="fg.muted"
          :_hover="{ color: 'fg' }"
        >
          <GripVertical :size="14" aria-hidden />
        </UiIconButton>
      </Box>
    </GridTableRow>

    <TimelineAddButtons
      v-if="!isLive"
      :payload="payload"
      :is-near="isNear"
    />
  </Box>
</template>
