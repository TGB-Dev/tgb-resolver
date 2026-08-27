<script setup lang="ts">
import { Keyboard, RotateCcw } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, iconButton } from "@styled-system/recipes";
import type { RegisterableHotkey } from "@tanstack/vue-hotkeys";
import { computed, watch } from "vue";

import { commandsById } from "./commands";
import KbdFromHotkeys from "./kbd-from-hotkeys.vue";
import { useShortcutsStore } from "./shortcuts-store";
import { CommandBindingKind, type CommandDefinition } from "./types";
import { useSequenceRecorder, useSingleRecorder } from "./use-shortcut-recorder";

const props = defineProps<{ command: CommandDefinition }>();

const id = props.command.id;
const store = useShortcutsStore();

const isSequence = computed(() => props.command.defaultBinding.kind === CommandBindingKind.Sequence);

// The single recorder only updates `recordedHotkey` live and never fires
// `onRecord` in this version — the caller commits it on stop (see toggleRecord).
const single = !isSequence.value ? useSingleRecorder() : null;
const sequence = isSequence.value
  ? useSequenceRecorder((seq) =>
      store.setBinding(id, { kind: CommandBindingKind.Sequence, sequence: seq }),
    )
  : null;

const isRecording = computed(
  () => single?.isRecording.value ?? sequence?.isRecording.value ?? false,
);

const isCustomized = computed(() => store.isCustomized(id));
const conflicts = computed(() =>
  store.conflictsFor(id).map((conflictId) => commandsById[conflictId].title),
);

// Keycaps to render: the live recording preview, or the saved binding.
const keycaps = computed<RegisterableHotkey[]>(() => {
  if (isRecording.value) {
    if (single?.recordedHotkey.value) return [single.recordedHotkey.value];
    if (sequence?.steps.value.length) return sequence.steps.value;
    return [];
  }
  if (store.isBound(id)) {
    return isSequence.value ? store.getSequence(id) : [store.getHotkey(id)];
  }
  return [];
});

const row = css({
  display: "grid",
  gridTemplateColumns: "1fr auto",
  alignItems: "center",
  gap: "4",
  paddingY: "2.5",
  paddingX: "3",
  borderRadius: "l2",
  _hover: { bg: "bg.muted" },
});

const info = css({ display: "flex", alignItems: "center", gap: "2", minW: 0 });
const group = css({ minW: 0 });
const titleRow = css({ display: "flex", alignItems: "center", gap: "2" });
const title = css({ fontWeight: "medium", fontSize: "sm", minW: 0 });
const description = css({ color: "fg.muted", fontSize: "xs", marginTop: "0.5" });
const warning = css({ color: "orange.300", fontSize: "xs", marginTop: "1" });
const actions = css({ display: "flex", alignItems: "center", gap: "2" });
const keysWrap = css({ display: "inline-flex", alignItems: "center", gap: "1" });
const muted = css({ color: "fg.muted", fontSize: "xs" });

function toggleRecord() {
  if (isRecording.value) {
    if (sequence) {
      // `onRecord` does not fire on commit in this version, so read the captured
      // chords directly and commit them ourselves, then reset the recorder.
      const steps = sequence.steps.value;
      if (steps.length) {
        store.setBinding(id, { kind: CommandBindingKind.Sequence, sequence: steps });
      }
      sequence.cancelRecording();
    } else {
      single?.stopRecording();
    }
  } else {
    single?.startRecording();
    sequence?.startRecording();
  }
}

// The single recorder captures a chord then auto-stops without firing `onRecord`,
// leaving the value in `recordedHotkey`. Commit it as soon as it is captured.
if (single) {
  watch(
    () => single.recordedHotkey.value,
    (value) => {
      if (!value) return;
      store.setBinding(id, { kind: CommandBindingKind.Hotkey, hotkey: value });
    },
  );
}
</script>

<template>
  <div :class="row">
    <div :class="info">
      <div :class="group">
        <div :class="titleRow">
          <span :class="title">{{ command.title }}</span>
        </div>
        <div v-if="command.description" :class="description">{{ command.description }}</div>
        <div v-if="conflicts.length" :class="warning">
          Conflicts with: {{ conflicts.join(", ") }}
        </div>
      </div>
      <button
        v-if="isCustomized"
        type="button"
        :class="cx(button({ size: 'xs', variant: 'ghost' }), iconButton(), css({ colorPalette: 'red' }))"
        :aria-label="`Reset ${command.title} to default`"
        @click="store.resetBinding(id)"
      >
        <RotateCcw :size="12" aria-hidden />
      </button>
    </div>

    <div :class="actions">
      <div v-if="keycaps.length" :class="keysWrap">
        <KbdFromHotkeys v-for="(hotkey, index) in keycaps" :key="index" :hotkey="hotkey" />
      </div>
      <span v-else-if="isRecording" :class="muted">Recording…</span>
      <span v-else :class="muted">Unassigned</span>

      <button
        type="button"
        :class="cx(button({ size: 'xs', variant: 'outline' }), css({ whiteSpace: 'nowrap' }))"
        :aria-label="`Rebind ${command.title}`"
        @click="toggleRecord"
      >
        <Keyboard :size="12" aria-hidden />
        {{ isRecording ? "Stop" : "Record new" }}
      </button>
    </div>
  </div>
</template>
