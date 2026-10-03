<script setup lang="ts">
import { Combobox, Dialog, useListCollection } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { combobox, dialog, input, kbd } from "@styled-system/recipes";
import type { RegisterableHotkey } from "@tanstack/vue-hotkeys";
import { useEventListener } from "@vueuse/core";
import { computed, ref, useTemplateRef, watch } from "vue";

import { scrollToListItem } from "@/features/leaderboard/utils/scroll";

import { commands, PALETTE_TOGGLE_EVENT } from "./commands";
import KbdFromHotkeys from "./kbd-from-hotkeys.vue";
import { useShortcutsStore } from "./shortcuts-store";
import { CommandBindingKind, type CommandDefinition } from "./types";

interface PaletteItem {
  label: string;
  value: string;
  keys: RegisterableHotkey[];
  run: () => void;
}

const shortcutStore = useShortcutsStore();
const inputValue = ref("");
const listRef = useTemplateRef<{ $el: HTMLElement }>("paletteList");

const dialogClasses = dialog({ placement: "top", size: "md" });
const comboClasses = combobox({ size: "lg" });

const allItems = computed<PaletteItem[]>(() =>
  commands.map((command) => ({
    label: command.title,
    value: `command:${command.id}`,
    keys: bindingKeys(command),
    run: () => command.handler(),
  })),
);

function bindingKeys(command: CommandDefinition): RegisterableHotkey[] {
  const binding = shortcutStore.getBinding(command.id);
  if (binding.kind === CommandBindingKind.Hotkey) return [binding.hotkey];
  if (binding.kind === CommandBindingKind.Sequence) return [...binding.sequence];
  return [];
}

const { collection, set, filter } = useListCollection<PaletteItem>({
  initialItems: [],
  filter: (itemText, filterText) =>
    itemText.toLowerCase().includes(filterText.trim().toLowerCase()),
});

function resetList(): void {
  set(allItems.value);
  filter(inputValue.value);
}

watch(allItems, resetList, { immediate: true });

watch(
  () => shortcutStore.paletteOpen,
  (open) => {
    if (!open) return;
    inputValue.value = "";
    set(allItems.value);
    filter("");
  },
);

function onInputValue(value: string): void {
  inputValue.value = value;
  filter(value);
}

function runItem(itemValue: string): void {
  const item = allItems.value.find((entry) => entry.value === itemValue);
  shortcutStore.closePalette();
  if (itemValue === "command:open-command-palette") return;
  item?.run();
}

// Ark's Vue binding never forwards zag's `onSelect` into the machine (only
// `onValueChange` and friends reach it), so selection is driven from there.
function onValueChange(details: { value: string[] }): void {
  const selected = details.value[details.value.length - 1];
  if (selected) runItem(selected);
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
const inputRow = css({
  px: "6",
  pt: "4",
  pb: "3",
  borderBottomWidth: "1px",
  borderColor: "border",
});
const list = cx(
  comboClasses.list,
  css({
    maxHeight: "50vh",
    overflowY: "auto",
    px: "3",
    py: "3",
    gap: "1",
    "--combobox-item-padding-x": "spacing.4",
    "--combobox-item-padding-y": "spacing.3",
  }),
);
const row = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  width: "full",
});
const hint = css({ display: "inline-flex", alignItems: "center", gap: "1" });
const empty = css({ color: "fg.muted", fontSize: "sm", textAlign: "center", p: "6" });
const footer = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  px: "6",
  py: "2",
  borderTopWidth: "1px",
  borderColor: "border",
  color: "fg.muted",
  fontSize: "xs",
});
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
          :collection="collection"
          :input-value="inputValue"
          :open="true"
          selection-behavior="clear"
          input-behavior="autohighlight"
          auto-focus
          @update:input-value="onInputValue"
          @value-change="onValueChange"
          @highlight-change="onHighlightChange"
        >
          <div :class="inputRow">
            <Combobox.Control :class="comboClasses.control">
              <Combobox.Input
                :class="input({ size: 'lg' })"
                placeholder="Type a command…"
                aria-label="Command palette"
              />
            </Combobox.Control>
          </div>
          <Combobox.List ref="paletteList" :class="list">
            <Combobox.Item
              v-for="item in collection.items"
              :key="item.value"
              :item="item"
              :data-palette-value="item.value"
              :class="comboClasses.item"
            >
              <span :class="row">
                <Combobox.ItemText>{{ item.label }}</Combobox.ItemText>
                <span v-if="item.keys.length" :class="hint">
                  <KbdFromHotkeys
                    v-for="(hotkey, index) in item.keys"
                    :key="index"
                    :hotkey="hotkey"
                  />
                </span>
              </span>
            </Combobox.Item>
            <Combobox.Empty :class="empty">No matches.</Combobox.Empty>
          </Combobox.List>
        </Combobox.Root>
        <div :class="footer">
          <span><kbd :class="kbd({ size: 'sm' })">↑↓</kbd> to navigate</span>
          <span><kbd :class="kbd({ size: 'sm' })">Enter</kbd> to run</span>
          <span><kbd :class="kbd({ size: 'sm' })">Esc</kbd> to close</span>
        </div>
      </Dialog.Content>
    </Dialog.Positioner>
  </Dialog.Root>
</template>
