import { HotkeysProvider, useHotkeySequence } from "@tanstack/vue-hotkeys";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";

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
    localStorage.clear();
    document.body.innerHTML =
      '<div style="overflow:auto"><div><div data-timeline-row id="r1"></div><div data-timeline-row id="r2"></div></div></div>';
    vi.mocked(animateScrollIntoView).mockClear();
  });

  it("gg jumps to the top row", () => {
    mount(Wrapper, { global: { plugins: [createPinia()] } });
    pressKey("g");
    pressKey("g");
    expect(animateScrollIntoView).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.objectContaining({ block: "start" }),
    );
  });

  it("Shift+G jumps to the bottom row", () => {
    mount(Wrapper, { global: { plugins: [createPinia()] } });
    pressKey("g", { shiftKey: true });
    expect(animateScrollIntoView).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.any(HTMLElement),
      expect.objectContaining({ block: "end" }),
    );
  });
});
