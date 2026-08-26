<script setup lang="ts">
import { Keyboard, RotateCcw } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, kbd } from "@styled-system/recipes";
import { computed } from "vue";

import type { CommandId } from "./commands";
import { commandsById } from "./commands";
import { formatHotkeyDisplay } from "./display";
import KbdFromHotkeys from "./kbd-from-hotkeys.vue";
import { useShortcutsStore } from "./shortcuts-store";
import { CommandBindingKind, type CommandDefinition } from "./types";
import { useSequenceRecorder, useSingleRecorder } from "./use-shortcut-recorder";

const props = defineProps<{ command: CommandDefinition }>();

const id = props.command.id as CommandId;
const store = useShortcutsStore();

const isSequence = props.command.defaultBinding.kind === CommandBindingKind.Sequence;

const single = !isSequence
  ? useSingleRecorder((hotkey) =>
      store.setBinding(id, { kind: CommandBindingKind.Hotkey, hotkey }),
    )
  : null;
const sequence = isSequence
  ? useSequenceRecorder((seq) =>
      store.setBinding(id, { kind: CommandBindingKind.Sequence, sequence: seq }),
    )
  : null;

const isRecording = computed(
  () => single?.isRecording.value ?? sequence?.isRecording.value ?? false,
);

const preview = computed(() => {
  if (single?.recordedHotkey.value) return formatHotkeyDisplay(single.recordedHotkey.value);
  return "";
});

const isCustomized = computed(() => store.isCustomized(id));
const conflicts = computed(() =>
  store.conflictsFor(id).map((conflictId) => commandsById[conflictId].title),
);

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

const title = css({ fontWeight: "medium", fontSize: "sm" });
const description = css({ color: "fg.muted", fontSize: "xs", marginTop: "0.5" });
const actions = css({ display: "flex", alignItems: "center", gap: "2" });
const warning = css({
  color: "orange.300",
  fontSize: "xs",
  marginTop: "1",
});

// The global reset forces <kbd> to the mono font, which breaks macOS glyphs
// (e.g. ⌘). Render keycaps in the body font instead, mirroring the Chakra app.
const kbdBody = css({ fontFamily: "body" });
// Spaces the per-step keycap groups for sequence bindings.
const keysWrap = css({ display: "inline-flex", alignItems: "center", gap: "1" });

function toggleRecord() {
  if (isRecording.value) {
    single?.stopRecording();
    sequence?.stopRecording();
  } else {
    single?.startRecording();
    sequence?.startRecording();
  }
}
</script>

<template>
  <div :class="row">
    <div :class="css({ minW: 0 })">
      <div :class="title">{{ command.title }}</div>
      <div v-if="command.description" :class="description">{{ command.description }}</div>
      <div v-if="conflicts.length" :class="warning">
        Conflicts with: {{ conflicts.join(", ") }}
      </div>
    </div>

    <div :class="actions">

      <div v-if="!isRecording && store.isBound(id)" :class="keysWrap">
        <template v-if="isSequence">
          <KbdFromHotkeys
            v-for="(step, index) in store.getSequence(id)"
            :key="index"
            :hotkey="step"
          />
        </template>
        <KbdFromHotkeys v-else :hotkey="store.getHotkey(id)" />
      </div>
      <kbd v-else-if="isRecording" :class="cx(kbd({ variant: 'outline' }), kbdBody)">
        {{ preview || "Press keys..." }}
      </kbd>
      <kbd v-else :class="cx(kbd({ variant: 'subtle' }), kbdBody)">Unassigned</kbd>

      <button
        type="button"
        :class="cx(button({ size: 'xs', variant: 'outline' }), css({ whiteSpace: 'nowrap' }))"
        :aria-label="`Rebind ${command.title}`"
        @click="toggleRecord"
      >
        <Keyboard :size="12" aria-hidden />
        {{ isRecording ? "Stop" : "Record new" }}
      </button>

      <button
        v-if="isCustomized"
        type="button"
        :class="cx(button({ size: 'xs', variant: 'ghost' }), css({ colorPalette: 'red' }))"
        :aria-label="`Reset ${command.title} to default`"
        @click="store.resetBinding(id)"
      >
        <RotateCcw :size="12" aria-hidden />
      </button>
    </div>
  </div>
</template>
