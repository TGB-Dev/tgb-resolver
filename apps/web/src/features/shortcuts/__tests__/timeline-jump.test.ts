import { HotkeysProvider } from "@tanstack/vue-hotkeys";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";

import { useShortcutsStore } from "../shortcuts-store";
import { CommandScope } from "../types";
import { useShortcutsRegistration } from "../use-shortcuts";

vi.mock("@/features/leaderboard/utils/scroll", () => ({
  animateScrollIntoView: vi.fn(),
}));

function pressKey(key: string, opts: KeyboardEventInit = {}): void {
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...opts }),
  );
}

const Harness = defineComponent({
  setup() {
    useShortcutsRegistration();
    return () => h("div");
  },
});
const Wrapper = defineComponent({
  setup() {
    return () => h(HotkeysProvider, () => h(Harness));
  },
});

describe("timeline jump sequences", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Activate the Control scope so Control-scoped commands (e.g. timeline
    // jumps) are live, mirroring how the router scope sync behaves in-app.
    useShortcutsStore().setActiveScopes([CommandScope.Control]);
    localStorage.clear();
    document.body.innerHTML =
      '<div style="overflow:auto"><div><div data-timeline-row id="r1"></div><div data-timeline-row id="r2"></div></div></div>';
    vi.mocked(animateScrollIntoView).mockClear();
  });

  it("gg jumps to the top row", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useShortcutsStore().setActiveScopes([CommandScope.Control]);
    mount(Wrapper, { global: { plugins: [pinia] } });
    pressKey("g");
    pressKey("g");
    expect(animateScrollIntoView).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.objectContaining({ block: "start" }),
    );
  });

  it("Shift+G jumps to the bottom row", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    useShortcutsStore().setActiveScopes([CommandScope.Control]);
    mount(Wrapper, { global: { plugins: [pinia] } });
    pressKey("g", { shiftKey: true });
    expect(animateScrollIntoView).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.objectContaining({ block: "end" }),
    );
  });
});
