<script setup lang="ts">
import { css } from "@styled-system/css";
import { ShowMode } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import Button from "@/features/shared/ui/button.vue";
import Heading from "@/features/shared/ui/heading.vue";
import { useShowStore } from "@/stores/show-store";

const showStore = useShowStore();
const floatingPanelStore = useFloatingPanelStore();

const mode = computed(() => showStore.showMode);
const events = computed(() => showStore.showEvents);
const meta = computed(() => showStore.showMeta);
const orderedIds = computed(() => showStore.showOrderedIds);
const dataVersion = computed(() => showStore.dataVersion);
const eventsCount = computed(() => Object.keys(events.value).length);
</script>

<template>
  <div :class="css({ h: 'full', p: '4', overflow: 'auto' })">
    <div :class="css({ display: 'flex', flexDirection: 'column', gap: '4', alignItems: 'stretch' })">
      <div>
        <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', mb: '2' })">
          <Heading size="md">Show Details</Heading>
          <Button
            size="sm"
            variant="outline"
            @click="floatingPanelStore.openFloatingPanel(FloatingPanelType.InspectShow, 'Inspect show')"
          >
            Inspect
          </Button>
        </div>
      </div>

      <div :class="css({ display: 'flex', flexDirection: 'column', gap: '2', alignItems: 'stretch' })">
        <div>
          <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">Mode</div>
          <div :class="css({ fontFamily: 'mono', fontSize: 'md' })">
            {{ mode === ShowMode.EDITING ? "Editing" : mode === ShowMode.LIVE ? "Live" : "Unknown" }}
          </div>
        </div>

        <div v-if="eventsCount > 0">
          <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">Timeline</div>
          <div :class="css({ fontFamily: 'mono', fontSize: 'md' })">
            {{ eventsCount }} event{{ eventsCount !== 1 ? "s" : "" }} | {{ orderedIds.length }} ordered
          </div>
        </div>

        <div v-if="meta">
          <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">Metadata</div>
          <pre :class="css({ fontFamily: 'mono', fontSize: 'xs', whiteSpace: 'pre-wrap', p: '2', bg: 'bg.muted', rounded: 'md' })">
            {{ JSON.stringify(meta, null, 2) }}
          </pre>
        </div>

        <div>
          <div :class="css({ fontSize: 'sm', color: 'fg.muted' })">Version</div>
          <div :class="css({ fontFamily: 'mono', fontSize: 'md' })">
            {{ dataVersion }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
