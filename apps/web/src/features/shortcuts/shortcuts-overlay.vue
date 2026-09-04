<script setup lang="ts">
import { Dialog } from "@ark-ui/vue";
import { X } from "@lucide/vue";
import { css, cx } from "@styled-system/css";
import { button, dialog, input, kbd } from "@styled-system/recipes";
import { useEventListener } from "@vueuse/core";
import { computed, ref, useTemplateRef } from "vue";

import { commands } from "./commands";
import { detectCurrentPlatform, PLATFORM_LABELS } from "./display";
import ShortcutsOverlayRow from "./shortcuts-overlay-row.vue";
import { useShortcutsStore } from "./shortcuts-store";
import type { CommandDefinition } from "./types";

const store = useShortcutsStore();
const query = ref("");
const searchInput = useTemplateRef("searchInput");

const dialogClasses = dialog({ placement: "center", size: "lg" });
const content = cx(
  dialogClasses.content,
  // Fixed height (not just maxHeight) so filtering results never resizes the
  // dialog — the body scrolls instead of the whole panel shifting.
  css({ height: "70vh", maxHeight: "70vh", display: "flex", flexDirection: "column" }),
);

const platform = detectCurrentPlatform();

const groups = computed(() => {
  const term = query.value.trim().toLowerCase();
  const buckets = new Map<string, CommandDefinition[]>();
  for (const command of commands) {
    if (term) {
      const haystack = `${command.title} ${command.description ?? ""} ${command.category}`.toLowerCase();
      if (!haystack.includes(term)) continue;
    }
    const list = buckets.get(command.category) ?? [];
    list.push(command);
    buckets.set(command.category, list);
  }
  return [...buckets.entries()].map(([category, items]) => ({ category, items }));
});

const canReset = computed(
  () => store.hasAnyConflict || commands.some((command) => store.isCustomized(command.id)),
);

function onOpenEvent() {
  store.openOverlay();
}

useEventListener(window, "tgb:shortcuts:open", onOpenEvent);

const header = css({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "3",
  padding: "5",
  borderBottomWidth: "1px",
  borderColor: "border",
});
const titleBlock = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const storedNote = css({ color: "fg.muted", fontSize: "xs" });
const searchRow = css({ paddingX: "5", paddingY: "3", borderBottomWidth: "1px", borderColor: "border" });
const body = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  padding: "4",
  overflowY: "auto",
  flex: "1 1 auto",
  minHeight: "0",
});
const categoryHeading = css({
  fontSize: "xs",
  fontWeight: "semibold",
  textTransform: "uppercase",
  letterSpacing: "wide",
  color: "fg.muted",
  marginTop: "2",
  marginBottom: "1",
});
const footer = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  padding: "4",
  borderTopWidth: "1px",
  borderColor: "border",
});
const hint = css({ color: "fg.muted", fontSize: "xs" });
const empty = css({ color: "fg.muted", fontSize: "sm", textAlign: "center", padding: "6" });

// <kbd> is reset to the mono font globally, which breaks macOS glyphs (e.g. ⌘).
const kbdBody = css({ fontFamily: "body" });
</script>

<template>
    <Dialog.Root
      :open="store.overlayOpen"
      :initial-focus-el="() => searchInput"
      @escape-key-down="store.closeOverlay()"
      @pointer-down-outside="store.closeOverlay()"
    >
    <Dialog.Backdrop :class="dialogClasses.backdrop" />
    <Dialog.Positioner :class="dialogClasses.positioner">
      <Dialog.Content :class="content">
        <div :class="header">
          <div :class="titleBlock">
            <div :class="css({ display: 'flex', alignItems: 'center', gap: '2' })">
              <Dialog.Title :class="dialogClasses.title">Keyboard shortcuts</Dialog.Title>
              <kbd :class="cx(kbd({ size: 'sm', variant: 'subtle' }), kbdBody)">{{ PLATFORM_LABELS[platform] }}</kbd>
            </div>
            <p :class="storedNote">Shortcuts are stored locally in browser</p>
          </div>
          <button
            type="button"
            :class="cx(button({ variant: 'ghost', size: 'sm' }), css({ padding: '1' }))"
            aria-label="Close"
            @click="store.closeOverlay()"
          >
            <X :size="14" aria-hidden />
          </button>
        </div>

        <div :class="searchRow">
          <input
            ref="searchInput"
            v-model="query"
            :class="input({ size: 'sm' })"
            type="text"
            placeholder="Search shortcuts"
            aria-label="Search shortcuts"
          />
        </div>

        <div :class="body">
          <template v-for="group in groups" :key="group.category">
            <div :class="categoryHeading">{{ group.category }}</div>
            <ShortcutsOverlayRow v-for="cmd in group.items" :key="cmd.id" :command="cmd" />
          </template>
          <p v-if="!groups.length" :class="empty">No shortcuts match “{{ query }}”.</p>
        </div>

        <div :class="footer">
          <span :class="hint">Press <kbd :class="cx(kbd({ size: 'sm' }), kbdBody)">Esc</kbd> to close</span>
          <button
            type="button"
            :class="button({ variant: 'outline', size: 'sm' })"
            :disabled="!canReset"
            @click="store.resetAll()"
          >
            Reset all to defaults
          </button>
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
</template>
