<script setup lang="ts">
import { Crosshair, FileDown, FileUp, Trash2 } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button } from "@styled-system/recipes";

import { useClearShowMutation, useControlCanMutate, useControlIsLive, useExportShowAction } from "@/features/control/composables/use-show";
import { useFloatingPanelStore } from "@/features/control/floating-panel-store";
import { FloatingPanelType } from "@/features/control/floating-panel-types";
import { useConfirmActionStore } from "@/stores/confirm-action-store";

const props = defineProps<{ onJumpToCurrent?: () => void }>();

const clearCurrentShow = useClearShowMutation();
const exportCurrentShow = useExportShowAction();
const isLive = useControlIsLive();
const canMutate = useControlCanMutate();
const floatingPanelStore = useFloatingPanelStore();
const confirmActionStore = useConfirmActionStore();

async function handleClearShow() {
  const first = await confirmActionStore.confirmAction({
    title: "Clear Show",
    message:
      "Are you sure you want to clear the show from the server? This action can't be undone. Ensure you have backups.",
    confirmLabel: "Yes, Clear",
    cancelLabel: "Cancel",
  });
  if (!first) return;
  const second = await confirmActionStore.confirmAction({
    title: "FINAL WARNING",
    message: "THIS IS THE LAST WARNING! THIS CANNOT BE UNDONE! CONTINUE?",
    confirmLabel: "CLEAR EVERYTHING",
    cancelLabel: "Cancel",
  });
  if (second) clearCurrentShow.mutate(undefined);
}
</script>

<template>
  <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', h: '16', borderTopWidth: 1, gap: '2', p: '2' })">
    <button
      v-if="props.onJumpToCurrent !== undefined"
      type="button"
      :class="button({ variant: 'solid' })"
      @click="props.onJumpToCurrent"
    >
      <Crosshair :size="16" aria-hidden />
      <span>To Current</span>
    </button>

    <template v-if="!isLive">
      <button
        type="button"
        :class="button({ variant: 'solid' })"
        :disabled="!canMutate"
        @click="exportCurrentShow"
      >
        <FileDown :size="16" aria-hidden />
        <span>Save</span>
      </button>

      <button
        type="button"
        :class="button({ variant: 'solid' })"
        :disabled="!canMutate"
        @click="floatingPanelStore.openFloatingPanel(FloatingPanelType.ImportShow, 'Import show')"
      >
        <FileUp :size="16" aria-hidden />
        <span>Load</span>
      </button>

      <button
        type="button"
        :class="cx(button({ variant: 'outline' }), css({ colorPalette: 'red' }))"
        :disabled="!canMutate"
        @click="handleClearShow"
      >
        <Trash2 :size="16" aria-hidden />
        <span>Clear</span>
      </button>
    </template>
  </div>
</template>
