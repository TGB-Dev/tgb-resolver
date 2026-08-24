<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { button, code, heading } from "@styled-system/recipes";
import { ShowMode } from "@tgb-resolver/realtime";
import { computed } from "vue";

import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
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
          <h2 :class="cx(heading({ size: 'md' }), css({ color: 'colorPalette.fg', fontWeight: 700, lineHeight: 1.2, marginBlock: 0 }))">
            Show Details
          </h2>
          <button
            type="button"
            :class="button({ size: 'sm', variant: 'outline' })"
            @click="floatingPanelStore.openFloatingPanel(FloatingPanelType.InspectShow, 'Inspect show')"
          >
            Inspect
          </button>
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
          <code :class="cx(code(), css({ display: 'block', whiteSpace: 'pre-wrap', p: 2 }))">
            {{ JSON.stringify(meta, null, 2) }}
          </code>
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
