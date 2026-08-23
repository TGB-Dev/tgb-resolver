<script setup lang="ts">
import { Check, GripVertical } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, gridTableRow, iconButton } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed, provide, ref } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { extensionRegistry } from "@/features/extensions/registry";
import Tooltip from "@/features/shared/ui/tooltip.vue";
import { useShowStore } from "@/stores/show-store";

import CurrentEventIndicator from "./current-event-indicator.vue";
import TimelineAddButtons from "./timeline-add-buttons.vue";
import TimelineCustomNameEditable from "./timeline-custom-name-editable.vue";
import TimelineEventPosition from "./timeline-event-position.vue";
import TimelineManualInteraction from "./timeline-manual-interaction.vue";
import TimelineNumberEditable from "./timeline-number-editable.vue";
import { timelineRowHoverKey } from "./timeline-row-hover";
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
// Hover state is provided for the hover-reactive leaves (add buttons, manual
// interaction toggle). Reading it here would re-render the whole row on every
// pointer enter/leave — a patch storm that also starves the WAAPI animations.
const isNear = ref(false);
provide(timelineRowHoverKey, isNear);

const isReorderable = computed(() => props.payload.type === TimelineEventType.CUS && !props.isLive);

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
  <!-- biome-ignore lint/a11y/noStaticElementInteractions: row-level hover/context/double-click affordances; inner controls remain the interactive elements -->
  <div
    :class="
      css({
        display: 'grid',
        w: 'full',
        minH: '8',
        position: 'relative',
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
    @pointerenter="isNear = true"
    @pointerleave="isNear = false"
    @contextmenu="emit('contextmenu', $event, payload)"
    @dblclick="handleDoubleClick"
  >
    <CurrentEventIndicator :event-id="payload.id" :duration-in-seconds="payload.durationSeconds" />

    <div :class="gridTableRow()" :style="{ gridTemplateColumns: templateColumns }">
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
        :class="
          css({ display: 'flex', alignItems: 'center', justifyContent: 'center', h: '6', m: 1 })
        "
      >
        <!-- Live mode is fully static: just the check mark, no hover affordance -->
        <Check
          v-if="isLive && payload.requireManualInteraction"
          :size="14"
          aria-hidden
        />
        <TimelineManualInteraction v-else-if="!isLive" :payload="payload" />
      </div>

      <div
        v-if="!isLive"
        :class="css({ display: 'flex', alignItems: 'center', justifyContent: 'center', h: 'full' })"
      >
        <Tooltip content="Drag to reorder event" :open-delay="0">
          <button
            type="button"
            aria-label="Drag to reorder event"
            :disabled="!isReorderable"
            :class="
              cx(
                button({ variant: 'ghost', size: '2xs' }),
                iconButton(),
                css({
                  color: 'fg.muted',
                  p: 0,
                  cursor: isReorderable ? 'grab' : 'not-allowed',
                  _active: { cursor: isReorderable ? 'grabbing' : 'not-allowed' },
                  _hover: { color: 'fg' },
                  _disabled: { cursor: 'not-allowed', color: 'fg.muted' },
                }),
              )
            "
          >
            <GripVertical :size="14" aria-hidden />
          </button>
        </Tooltip>
      </div>
    </div>

    <TimelineAddButtons v-if="!isLive" :payload="payload" />
  </div>
</template>
