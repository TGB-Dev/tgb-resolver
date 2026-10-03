import { VueQueryPlugin } from "@tanstack/vue-query";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";

import { queryClient } from "@/features/shared/app/providers";

import CommandPalette from "../command-palette.vue";
import { commandsById } from "../commands";
import { useShortcutsStore } from "../shortcuts-store";
import { CommandBindingKind } from "../types";

const Harness = defineComponent({
  setup() {
    return () => h(CommandPalette);
  },
});

describe("command palette", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("registers Mod+K with no conflicts", () => {
    const store = useShortcutsStore();
    const binding = store.getBinding("open-command-palette");
    expect(binding.kind).toBe(CommandBindingKind.Hotkey);
    expect(store.conflictsFor("open-command-palette")).toEqual([]);
  });

  it("moved create-folder off the Mod+K prefix", () => {
    const store = useShortcutsStore();
    expect(store.getBinding("assets-create-folder")).toEqual(
      commandsById["assets-create-folder"].defaultBinding,
    );
    expect(store.conflictsFor("assets-create-folder")).toEqual([]);
  });

  it("lists commands when the workspace is not ready", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useShortcutsStore();
    store.openPalette();
    const wrapper = mount(Harness, {
      attachTo: document.body,
      global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
    });
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.textContent).toContain("Command palette");
    expect(document.body.textContent).toContain("Commands");
    expect(document.body.textContent).not.toContain("Views");
    wrapper.unmount();
    store.closePalette();
  });
});
