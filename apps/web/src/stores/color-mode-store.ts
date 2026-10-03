import { useColorMode } from "@vueuse/core";
import { defineStore } from "pinia";

export enum ColorMode {
  Light = "light",
  Dark = "dark",
}

export const useColorModeStore = defineStore("color-mode", () => {
  const mode = useColorMode({
    storageKey: "color-mode",
    attribute: "class",
    initialValue: ColorMode.Dark,
    disableTransition: true,
  });

  function setColorMode(newMode: ColorMode) {
    mode.value = newMode;
  }

  function toggleColorMode() {
    mode.value = mode.value === ColorMode.Dark ? ColorMode.Light : ColorMode.Dark;
  }

  return {
    colorMode: mode,
    isDark: mode,
    setColorMode,
    toggleColorMode,
  };
});
