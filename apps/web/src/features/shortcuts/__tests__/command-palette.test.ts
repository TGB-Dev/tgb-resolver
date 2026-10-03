import { VueQueryPlugin } from "@tanstack/vue-query";
import { resetPlayback } from "@tgb-resolver/contracts";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { queryClient } from "@/features/shared/app/providers";
import { ColorMode, useColorModeStore } from "@/stores/color-mode-store";

import CommandPalette from "../command-palette.vue";
import { commandsById } from "../commands";
import { useShortcutsStore } from "../shortcuts-store";
import { CommandBindingKind } from "../types";

vi.mock("@tgb-resolver/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tgb-resolver/contracts")>()),
  resetPlayback: vi.fn().mockResolvedValue(undefined),
}));

const Harness = defineComponent({
  setup() {
    return () => h(CommandPalette);
  },
});

async function openPalette(pinia: ReturnType<typeof createPinia>) {
  const store = useShortcutsStore();
  store.openPalette();
  const wrapper = mount(Harness, {
    attachTo: document.body,
    global: { plugins: [pinia, [VueQueryPlugin, { queryClient }]] },
  });
  await new Promise((resolve) => setTimeout(resolve, 50));
  return { store, wrapper };
}

function pressKey(key: string): void {
  const input = document.body.querySelector("input");
  input?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

describe("command palette", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    document.body.innerHTML = "";
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
    const { store, wrapper } = await openPalette(pinia);
    expect(document.body.textContent).toContain("Command palette");
    expect(document.body.textContent).toContain("Play / Pause");
    wrapper.unmount();
    store.closePalette();
  });

  it("arrow keys move the highlight and Enter runs that command", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const color = useColorModeStore();
    color.setColorMode(ColorMode.Dark);
    const { store, wrapper } = await openPalette(pinia);

    // Nothing is highlighted until the user navigates, so Enter is inert first.
    pressKey("Enter");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(store.paletteOpen).toBe(true);

    pressKey("ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.querySelector("[data-highlighted]")?.getAttribute("data-value")).toBe(
      "command:open-shortcuts",
    );

    pressKey("ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 50));
    pressKey("ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(document.body.querySelector("[data-highlighted]")?.getAttribute("data-value")).toBe(
      "command:toggle-color-mode",
    );

    pressKey("Enter");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(store.paletteOpen).toBe(false);
    expect(color.colorMode).toBe(ColorMode.Light);
    wrapper.unmount();
    store.closePalette();
    color.setColorMode(ColorMode.Dark);
  });

  it("Enter runs the highlighted command after filtering", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const { store, wrapper } = await openPalette(pinia);

    const input = document.body.querySelector("input") as HTMLInputElement;
    input.value = "jump to start";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(document.body.querySelectorAll("[data-part='item']")).toHaveLength(1);
    pressKey("ArrowDown");
    await new Promise((resolve) => setTimeout(resolve, 50));
    pressKey("Enter");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(store.paletteOpen).toBe(false);
    expect(resetPlayback).toHaveBeenCalled();
    wrapper.unmount();
    store.closePalette();
  });
});
