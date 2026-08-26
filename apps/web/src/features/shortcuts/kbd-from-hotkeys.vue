<script setup lang="ts">
import { css, cx } from "@styled-system/css";
import { kbd } from "@styled-system/recipes";
import {
  formatForDisplay,
  type Hotkey,
  type ParsedHotkey,
  type RegisterableHotkey,
} from "@tanstack/vue-hotkeys";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    hotkey: RegisterableHotkey;
    /** When false, render nothing (mirrors the reference's `!isModHeld` skip). */
    show?: boolean;
  }>(),
  { show: true },
);

// 1-1 with the reference React component: split on "+" when present, otherwise
// on individual characters (the library returns a space-joined string on macOS).
const keys = computed(() => {
  const formatted = formatForDisplay(props.hotkey as Hotkey | string | ParsedHotkey);
  return formatted.includes("+")
    ? formatted.split("+")
    : Array.from(formatted)
        .map((key) => key.trim())
        .filter(Boolean);
});

// The global reset forces <kbd> to the mono font, which breaks macOS glyphs
// (e.g. ⌘). Keep the body font, matching the reference's `fontFamily="body"`.
const kbdBody = css({ fontFamily: "body" });
const wrapper = css({ display: "inline-flex", alignItems: "center", gap: "0.5" });
</script>

<template>
  <div v-if="show" :class="wrapper">
    <kbd
      v-for="(key, index) in keys"
      :key="index"
      :class="cx(kbd(), kbdBody)"
    >
      {{ key }}
    </kbd>
  </div>
</template>
