<script setup lang="ts">
import { Combobox, createListCollection, Dialog } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { command, dialog, kbd } from "@styled-system/recipes";
import { formatForDisplay, type RegisterableHotkeyChord } from "@tanstack/vue-hotkeys";
import { useEventListener } from "@vueuse/core";
import { computed, ref, useTemplateRef, watch } from "vue";

import { scrollToListItem } from "@/features/leaderboard/utils/scroll";

import { commands, PALETTE_TOGGLE_EVENT } from "./commands";
import { useShortcutsStore } from "./shortcuts-store";
import { CommandBindingKind, type CommandDefinition } from "./types";

interface PaletteItem {
  label: string;
  value: string;
  keys: RegisterableHotkeyChord[];
  run: () => void;
}

const shortcutStore = useShortcutsStore();
const inputValue = ref("");
const listRef = useTemplateRef<{ $el: HTMLElement }>("paletteList");

const dialogClasses = dialog({ placement: "top", size: "md" });
const commandClasses = command({ size: "lg" });

const allItems = computed<PaletteItem[]>(() =>
  commands.map((command) => ({
    label: command.title,
    value: `command:${command.id}`,
    keys: bindingKeys(command),
    run: () => command.handler(),
  })),
);

function bindingKeys(command: CommandDefinition): RegisterableHotkeyChord[] {
  const binding = shortcutStore.getBinding(command.id);
  if (binding.kind === CommandBindingKind.Hotkey) return [binding.hotkey];
  if (binding.kind === CommandBindingKind.Sequence) return [...binding.sequence];
  return [];
}

const collection = computed(() => {
  const query = inputValue.value.trim().toLowerCase();
  const items = allItems.value.map((item) => {
    const text = item.label.toLowerCase();
    const match = text.indexOf(query);
    if (match >= 0) return { item, score: match === 0 ? 2 : 1 };
    let index = 0;
    for (const character of text) if (character === query[index]) index++;
    return { item, score: index === query.length ? 0.5 : 0 };
  });
  return createListCollection({
    items: items.filter(({ score }) => score > 0).sort((a, b) => b.score - a.score).map(({ item }) => item),
  });
});

watch(() => shortcutStore.paletteOpen, (open) => {
  if (open) inputValue.value = "";
});

function runItem(itemValue: string): void {
  const item = allItems.value.find((entry) => entry.value === itemValue);
  shortcutStore.closePalette();
  if (itemValue === "command:open-command-palette") return;
  item?.run();
}

function onSelect(details: { itemValue: string }): void {
  runItem(details.itemValue);
}

function onHighlightChange(details: { highlightedValue: string | null }): void {
  const container = listRef.value?.$el;
  if (!details.highlightedValue || !container) return;
  const selector = `[data-palette-value="${CSS.escape(details.highlightedValue)}"]`;
  const element = container.querySelector<HTMLElement>(selector);
  if (!element) return;
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  if (elementRect.bottom > containerRect.bottom) {
    scrollToListItem({ container, selector, align: "end" });
  } else if (elementRect.top < containerRect.top) {
    scrollToListItem({ container, selector, align: "start" });
  }
}

useEventListener(window, PALETTE_TOGGLE_EVENT, () => shortcutStore.togglePalette());

const content = cx(dialogClasses.content, css({ overflow: "hidden" }));
const list = cx(commandClasses.list, css({ maxHeight: "50vh" }));
const row = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  width: "full",
});
const hint = css({ display: "inline-flex", alignItems: "center", gap: "1" });
const shortcut = cx(commandClasses.itemCommand, css({ fontFamily: "body", "& + &": { marginInlineStart: "0" } }));

</script>

<template>
  <Dialog.Root
    :open="shortcutStore.paletteOpen"
    @escape-key-down="shortcutStore.closePalette()"
    @pointer-down-outside="shortcutStore.closePalette()"
  >
    <Dialog.Backdrop :class="dialogClasses.backdrop" />
    <Dialog.Positioner :class="dialogClasses.positioner">
      <Dialog.Content :class="content">
        <Dialog.Title :class="css({ srOnly: true })">Command palette</Dialog.Title>
        <Combobox.Root
          :class="commandClasses.root"
          :collection="collection"
          :input-value="inputValue"
          :open="true"
          selection-behavior="preserve"
          :model-value="[]"
          :disable-layer="true"
          input-behavior="autohighlight"
          auto-focus
          @update:input-value="inputValue = $event"
          @select="onSelect"
          @highlight-change="onHighlightChange"
        >
            <Combobox.Control :class="commandClasses.control">
              <Combobox.Input
                :class="commandClasses.input"
                placeholder="Type a command…"
                aria-label="Command palette"
              />
            </Combobox.Control>
          <Combobox.List ref="paletteList" :class="list">
            <Combobox.Item
              v-for="item in collection.items"
              :key="item.value"
              :item="item"
              :data-palette-value="item.value"
              :class="commandClasses.item"
            >
              <span :class="row">
                <Combobox.ItemText :class="commandClasses.itemText">{{ item.label }}</Combobox.ItemText>
                <span v-if="item.keys.length" :class="hint">
                  <kbd v-for="(hotkey, index) in item.keys" :key="index" :class="shortcut">{{ formatForDisplay(hotkey) }}</kbd>
                </span>
              </span>
            </Combobox.Item>
            <Combobox.Empty :class="commandClasses.empty">No matches.</Combobox.Empty>
          </Combobox.List>
        <div :class="commandClasses.footer">
          <span><kbd :class="kbd({ size: 'sm' })">↑↓</kbd> to navigate</span>
          <span><kbd :class="kbd({ size: 'sm' })">Enter</kbd> to run</span>
          <span><kbd :class="kbd({ size: 'sm' })">Esc</kbd> to close</span>
        </div>
        </Combobox.Root>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
</template>
