import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import { formatBinding } from "../display";
import { useShortcutsStore } from "../shortcuts-store";
import { CommandBindingKind } from "../types";

describe("shortcuts display", () => {
  it("renders a portable Mod binding per platform", () => {
    expect(formatBinding({ kind: CommandBindingKind.Hotkey, hotkey: "Mod+S" }, "windows")).toBe(
      "Ctrl+S",
    );
    expect(formatBinding({ kind: CommandBindingKind.Hotkey, hotkey: "Mod+S" }, "mac")).toContain(
      "S",
    );
  });

  it("renders sequences as space-separated chords", () => {
    expect(
      formatBinding({ kind: CommandBindingKind.Sequence, sequence: ["G", "G"] }, "windows"),
    ).toBe("G  G");
  });

  it("renders unassigned bindings as empty", () => {
    expect(formatBinding({ kind: CommandBindingKind.None })).toBe("");
  });

  it("shows the ? glyph for Shift+/", () => {
    expect(
      formatBinding({ kind: CommandBindingKind.Hotkey, hotkey: { key: "/", shift: true } }),
    ).toBe("?");
  });
});

describe("shortcuts store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("detects conflicting bindings", () => {
    const store = useShortcutsStore();
    store.setBinding("play-toggle", { kind: CommandBindingKind.Hotkey, hotkey: "Mod+J" });
    expect(store.conflictsFor("toggle-color-mode")).toContain("play-toggle");
    expect(store.conflictsFor("play-toggle")).toContain("toggle-color-mode");
  });

  it("tracks customization and resets to defaults", () => {
    const store = useShortcutsStore();
    expect(store.isCustomized("play-toggle")).toBe(false);
    store.setBinding("play-toggle", { kind: CommandBindingKind.Hotkey, hotkey: "Mod+Z" });
    expect(store.isCustomized("play-toggle")).toBe(true);
    store.resetBinding("play-toggle");
    expect(store.isCustomized("play-toggle")).toBe(false);
  });

  it("persists bindings to localStorage", async () => {
    const store = useShortcutsStore();
    store.setBinding("play-toggle", { kind: CommandBindingKind.Hotkey, hotkey: "Mod+Z" });
    await nextTick();
    const raw = localStorage.getItem("tgb-shortcuts-bindings");
    expect(raw).toContain("Mod+Z");
  });
});
