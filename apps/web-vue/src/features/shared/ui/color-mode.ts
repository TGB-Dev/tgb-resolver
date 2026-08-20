import { storeToRefs } from "pinia";

import { useColorModeStore } from "@/stores/color-mode-store";

export function useColorMode() {
  const store = useColorModeStore();
  const { colorMode, isDark } = storeToRefs(store);
  return {
    colorMode,
    isDark,
    setColorMode: store.setColorMode,
    toggleColorMode: store.toggleColorMode,
  };
}

export type { ColorMode } from "@/stores/color-mode-store";
