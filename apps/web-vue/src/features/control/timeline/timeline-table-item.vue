<script setup lang="ts">
import { GripVertical } from "@lucide/vue";
import { css } from "@styled-system/css";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, ref, watchEffect } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { usePlaybackStore } from "@/features/control/playback-store";
import { extensionRegistry } from "@/features/extensions/registry";
import { useColorMode } from "@/features/shared/ui/color-mode";
import GridTableRow from "@/features/shared/ui/grid-table-row.vue";
import IconButton from "@/features/shared/ui/icon-button.vue";
import Tooltip from "@/features/shared/ui/tooltip.vue";
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
const playback = usePlaybackStore();
const { colorMode } = useColorMode();
const isNear = ref(false);
const rowEl = ref<HTMLElement>();

const isReorderable = computed(() => props.payload.type === TimelineEventType.CUS && !props.isLive);

// Mirror the React reference: the currently-playing row gets an inverted text
// color (only in light mode, to avoid clashing with the dark theme). Applied
// imperatively to this leaf so only the row text color changes on playback.
const isActive = computed(
  () =>
    playback.currentEventId === props.payload.id ||
    playback.state.activeEventIds.includes(props.payload.id),
);

watchEffect(() => {
  const el = rowEl.value;
  if (!el) return;
  const activeInLightMode = isActive.value && colorMode.value === "light";
  el.style.color = activeInLightMode ? "var(--colors-fg-inverted)" : "";
});

const templateColumns = computed(() =>
  props.isLive ? timelineTableGridTemplateColumnsStatic : timelineTableGridTemplateColumns,
);

const type = computed(() =>
  props.payload.type === TimelineEventType.CUS
    ? (extensionRegistry.extensionWithExtId(props.payload.extId ?? "")?.shortName ?? "UNK")
    : props.payload.type,
);

const position = computed(
  () => showStore.showOrderedIds.indexOf(props.payload.id) + 1 || props.payload.position,
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
  <tr
    ref="rowEl"
    :class="
      css({
        display: 'grid',
        w: 'full',
        minH: '8',
        position: 'relative',
        borderBottomWidth: 1,
        borderColor: 'border',
      '& .add-btn-wrapper': {
        opacity: 0,
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
        transitionTimingFunction: 'swiftOut',
        pointerEvents: 'none',
      },
        '&:hover .add-btn-wrapper': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      })
    "
    :data-event-id="payload.id"
    :data-current="isLive || undefined"
    tabindex="0"
    @pointerenter="isNear = true"
    @pointerleave="isNear = false"
    @contextmenu="emit('contextmenu', $event, payload)"
    @dblclick="handleDoubleClick"
  >
    <CurrentEventIndicator :event-id="payload.id" :duration-in-seconds="payload.durationSeconds" />

    <GridTableRow :templateColumns="templateColumns">
      <TimelineEventPosition
        :event-id="payload.id"
        :position="position"
        @seek="emit('seek', $event)"
      />

      <div :class="css({ fontFamily: 'mono', textTransform: 'uppercase' })">
        {{ type }}
      </div>

      <div :class="css({ minW: 0 })">
        <TimelineCustomNameEditable v-if="!isLive" :payload="payload" />
        <div v-else>
          {{ resolveDisplayName(payload) }}
        </div>
      </div>

      <div
        :class="
          css({
            fontFamily: 'mono',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })
        "
      >
        {{ payload.problem ?? "" }}
        <template v-if="payload.problem && payload.newProblemScore !== undefined">
          ({{ payload.newProblemScore }})
        </template>
      </div>

      <div :class="css({ textAlign: 'end', fontFamily: 'mono' })">
        {{ payload.newTotalScore ?? "" }}
      </div>

      <div :class="css({ textAlign: 'end', fontFamily: 'mono' })">
        {{ payload.newRank ?? "" }}
      </div>

      <TimelineNumberEditable v-if="!isLive" :payload="payload" field="durationSeconds" />
      <div v-else :class="css({ textAlign: 'end', fontFamily: 'mono' })">
        {{ payload.durationSeconds ?? "" }}
      </div>

      <TimelineNumberEditable v-if="!isLive" :payload="payload" field="triggerOffsetSeconds" />
      <div v-else :class="css({ textAlign: 'end', fontFamily: 'mono' })">
        {{
          payload.triggerOffsetSeconds != null && payload.triggerOffsetSeconds > 0
            ? `+${payload.triggerOffsetSeconds}`
            : ""
        }}
      </div>

      <div
        :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', h: '6' })"
      >
        <TimelineManualInteraction :payload="payload" :is-near="isNear" />
      </div>

      <div
        v-if="!isLive"
        :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', h: 'full' })"
      >
        <Tooltip content="Drag to reorder event" :open-delay="0">
          <IconButton
            ariaLabel="Drag to reorder event"
            size="2xs"
            variant="ghost"
            :disabled="!isReorderable"
            :class="
              css({
                color: 'fg.muted',
                p: 0,
                cursor: 'grab',
                _hover: { color: 'fg' },
                _disabled: { cursor: 'not-allowed', color: 'fg.muted' },
              })
            "
          >
            <GripVertical :size="14" aria-hidden />
          </IconButton>
        </Tooltip>
      </div>
    </GridTableRow>

    <TimelineAddButtons v-if="!isLive" :payload="payload" :is-near="isNear" />
  </tr>
</template>
