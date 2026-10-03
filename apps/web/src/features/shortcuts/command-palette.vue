<script setup lang="ts">
import { Combobox, Dialog, useListCollection } from "@ark-ui/vue";
import { css, cx } from "@styled-system/css";
import { combobox, dialog, kbd } from "@styled-system/recipes";
import { useEventListener } from "@vueuse/core";
import { computed, ref, watch } from "vue";

import { useControlIsLive } from "@/features/control/composables/use-show";
import { useControlWorkspaceStore } from "@/features/control/trellis/control-workspace-store";
import {
  CONTROL_VIEW_IDS,
  CONTROL_VIEW_TITLES,
  ControlViewType,
  EDIT_ONLY_VIEWS,
} from "@/features/control/trellis/control-workspace-types";

import { commands, PALETTE_TOGGLE_EVENT } from "./commands";
import { formatBinding } from "./display";
import { useShortcutsStore } from "./shortcuts-store";

interface PaletteItem {
  label: string;
  value: string;
  group: string;
  hint: string;
  run: () => void;
}

const VIEW_GROUP = "Views";
const COMMAND_GROUP = "Commands";
const GROUP_ORDER: readonly string[] = [VIEW_GROUP, COMMAND_GROUP];

const shortcutStore = useShortcutsStore();
const workspaceStore = useControlWorkspaceStore();
const isLive = useControlIsLive();
const inputValue = ref("");

const dialogClasses = dialog({ placement: "top", size: "md" });
const comboClasses = combobox();

const viewItems = computed<PaletteItem[]>(() => {
  const workspace = workspaceStore.workspace;
  if (!workspaceStore.ready || !workspace) return [];
  const live = isLive.value;
  return (Object.values(ControlViewType) as ControlViewType[])
    .filter((type) => !(live && (EDIT_ONLY_VIEWS as readonly ControlViewType[]).includes(type)))
    .map((type) => ({
      label: CONTROL_VIEW_TITLES[type],
      value: `view:${type}`,
      group: VIEW_GROUP,
      hint: workspace.view(CONTROL_VIEW_IDS[type]) == null ? "Closed" : "Open",
      run: () => workspaceStore.focusView(type),
    }));
});

const commandItems = computed<PaletteItem[]>(() =>
  commands.map((command) => ({
    label: command.title,
    value: `command:${command.id}`,
    group: COMMAND_GROUP,
    hint: formatBinding(shortcutStore.getBinding(command.id)),
    run: () => command.handler(),
  })),
);

const allItems = computed<PaletteItem[]>(() => [...viewItems.value, ...commandItems.value]);

const { collection, set, filter } = useListCollection<PaletteItem>({
  initialItems: [],
  filter: (itemText, filterText) =>
    itemText.toLowerCase().includes(filterText.trim().toLowerCase()),
});

const grouped = computed(() =>
  GROUP_ORDER.map((group) => ({
    group,
    items: collection.value.items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0),
);

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

function onSelect(details: { itemValue: string }): void {
  const item = allItems.value.find((entry) => entry.value === details.itemValue);
  shortcutStore.closePalette();
  if (details.itemValue === "command:open-command-palette") return;
  item?.run();
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
  css({ maxHeight: "50vh", overflowY: "auto", px: "3", py: "2", gap: "0" }),
);
const groupLabel = css({
  fontSize: "xs",
  fontWeight: "semibold",
  textTransform: "uppercase",
  letterSpacing: "wide",
  color: "fg.muted",
  px: "2",
  py: "1",
});
const row = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  width: "full",
});
const hint = css({ color: "fg.muted", fontSize: "xs", whiteSpace: "nowrap" });
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
          @select="onSelect"
        >
          <div :class="inputRow">
            <Combobox.Control :class="comboClasses.control">
              <Combobox.Input
                :class="comboClasses.input"
                placeholder="Type a command or view…"
                aria-label="Command palette"
              />
            </Combobox.Control>
          </div>
          <Combobox.List :class="list">
            <Combobox.ItemGroup v-for="entry in grouped" :key="entry.group">
              <Combobox.ItemGroupLabel :class="groupLabel">{{ entry.group }}</Combobox.ItemGroupLabel>
              <Combobox.Item
                v-for="item in entry.items"
                :key="item.value"
                :item="item"
                :class="comboClasses.item"
              >
                <span :class="row">
                  <Combobox.ItemText>{{ item.label }}</Combobox.ItemText>
                  <span :class="hint">{{ item.hint }}</span>
                </span>
              </Combobox.Item>
            </Combobox.ItemGroup>
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
