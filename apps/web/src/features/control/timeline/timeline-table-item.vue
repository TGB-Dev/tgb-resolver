<script setup lang="ts">
import { Check, GripVertical } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, gridTableRow, iconButton } from "@styled-system/recipes";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { computed } from "vue";

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

// Hover affordances (add buttons, drag handle, manual-interaction toggle) are
// always mounted; reveal/hide is pure CSS so pointer enter/leave never
// triggers Vue re-renders and dnd drags survive leaving the row bounds.
// Add buttons handle their own group-hover reveal in the recipe; this block
// only switches the manual-interaction idle check vs hover toggle button.
const hoverRevealCss = css({
  "& .manual-active": { display: "none" },
  "& .manual-idle": { display: "block" },
  "&:hover .manual-active": { display: "flex" },
  "&:hover .manual-idle": { display: "none" },
});

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
      cx(
        css({
          display: 'grid',
          w: 'full',
          minH: '8',
          position: 'relative',
        }),
        hoverRevealCss,
      )
    "
    :data-event-id="payload.id"
    :data-current="isLive || undefined"
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
        <Tooltip :content="isReorderable ? 'Drag to reorder event' : 'Cannot be reordered'" :open-delay="0">
          <button
            type="button"
            data-drag-handle
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
