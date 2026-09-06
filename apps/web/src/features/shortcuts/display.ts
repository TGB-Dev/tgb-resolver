import {
  detectPlatform,
  formatForDisplay,
  type HotkeySequence,
  normalizeRegisterableHotkey,
  type RegisterableHotkey,
} from "@tanstack/vue-hotkeys";

import { type CommandBinding, CommandBindingKind } from "./types";

export type Platform = "mac" | "windows" | "linux";

/** Detect the current platform, falling back to `windows` for unknown. */
export function detectCurrentPlatform(): Platform {
  const detected = detectPlatform();
  return detected === "mac" || detected === "windows" || detected === "linux"
    ? detected
    : "windows";
}

/**
 * `Shift+/` produces the "?" glyph but the library renders it as "⇧ /".
 * Surface the friendly glyph in the cheatsheet.
 */
const DISPLAY_OVERRIDES: Record<string, string> = {
  "Shift+/": "?",
};

function withOverride(normalized: string, rendered: string): string {
  return DISPLAY_OVERRIDES[normalized] ?? rendered;
}

function formatHotkeyDisplay(
  hotkey: RegisterableHotkey,
  platform: Platform = detectCurrentPlatform(),
): string {
  const normalized = normalizeRegisterableHotkey(hotkey);
  return withOverride(normalized, formatForDisplay(hotkey, { platform }));
}

function formatSequenceDisplay(
  sequence: HotkeySequence,
  platform: Platform = detectCurrentPlatform(),
): string {
  return sequence
    .map((step) => {
      const normalized = normalizeRegisterableHotkey(step);
      return withOverride(normalized, formatForDisplay(step, { platform }));
    })
    .join("  ");
}

/** Render any command binding as a platform-aware display string ("" when unassigned). */
export function formatBinding(
  binding: CommandBinding,
  platform: Platform = detectCurrentPlatform(),
): string {
  if (binding.kind === CommandBindingKind.None) return "";
  if (binding.kind === CommandBindingKind.Hotkey)
    return formatHotkeyDisplay(binding.hotkey, platform);
  return formatSequenceDisplay(binding.sequence, platform);
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};
