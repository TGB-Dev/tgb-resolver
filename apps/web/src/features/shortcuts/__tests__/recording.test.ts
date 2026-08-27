import { mount } from "@vue/test-utils";
import { createPinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { commands } from "../commands";
import ShortcutsOverlayRow from "../shortcuts-overlay-row.vue";
import { useShortcutsStore } from "../shortcuts-store";
import { CommandBindingKind } from "../types";

function commandById(id: string) {
  const found = commands.find((c) => c.id === id);
  if (!found) throw new Error(`command not found: ${id}`);
  return found;
}

function pressKey(key: string, mods: KeyboardEventInit = {}) {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...mods }),
  );
}

function recordButton(wrapper: ReturnType<typeof mount>) {
  const btn = wrapper.findAll("button").find((b) => /Record|Stop/.test(b.text()));
  if (!btn) throw new Error("record button not found");
  return btn;
}

describe("shortcuts overlay row recording", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(id: string) {
    const pinia = createPinia();
    const wrapper = mount(ShortcutsOverlayRow, {
      props: { command: commandById(id) },
      global: { plugins: [pinia] },
    });
    return { pinia, wrapper };
  }

  it("commits a single hotkey on capture and updates the display", async () => {
    const { pinia, wrapper } = setup("toggle-color-mode");
    const store = useShortcutsStore(pinia);

    expect(store.isCustomized("toggle-color-mode")).toBe(false);

    await recordButton(wrapper).trigger("click");
    await wrapper.vm.$nextTick();

    pressKey("j", { shiftKey: true, metaKey: true });
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(store.isCustomized("toggle-color-mode")).toBe(true);
    expect(store.getHotkey("toggle-color-mode")).toContain("Shift");
    expect(wrapper.text()).toContain("Shift");
  });

  it("commits a sequence with Stop and stores the sequence binding", async () => {
    const { pinia, wrapper } = setup("timeline-jump-top");
    const store = useShortcutsStore(pinia);

    await recordButton(wrapper).trigger("click");
    await wrapper.vm.$nextTick();

    pressKey("k");
    await wrapper.vm.$nextTick();
    pressKey("k");
    await wrapper.vm.$nextTick();

    await recordButton(wrapper).trigger("click");
    await wrapper.vm.$nextTick();
    await wrapper.vm.$nextTick();

    expect(store.isCustomized("timeline-jump-top")).toBe(true);
    expect(store.getSequence("timeline-jump-top")).toEqual(["K", "K"]);
  });

  it("does not treat the default as customized", () => {
    const { pinia } = setup("play-toggle");
    const store = useShortcutsStore(pinia);
    expect(store.isCustomized("play-toggle")).toBe(false);
    expect(store.getBinding("play-toggle").kind).toBe(CommandBindingKind.Hotkey);
  });
});
