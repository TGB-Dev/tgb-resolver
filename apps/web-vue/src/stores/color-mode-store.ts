import { useColorMode } from "@vueuse/core";
import { defineStore } from "pinia";

export type ColorMode = "light" | "dark";

export const useColorModeStore = defineStore("color-mode", () => {
  const mode = useColorMode({
    storageKey: "color-mode",
    attribute: "class",
    initialValue: "dark",
    disableTransition: true,
  });

  function setColorMode(newMode: ColorMode) {
    mode.value = newMode;
  }

  function toggleColorMode() {
    mode.value = mode.value === "dark" ? "light" : "dark";
  }

  return {
    colorMode: mode,
    isDark: mode,
    setColorMode,
    toggleColorMode,
  };
});
