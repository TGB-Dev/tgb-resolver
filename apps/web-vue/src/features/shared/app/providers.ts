import type { HotkeysProviderOptions } from "@tanstack/vue-hotkeys";
import { QueryClient } from "@tanstack/vue-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: 1,
    },
  },
});

export const hotkeysDefaultOptions: HotkeysProviderOptions = {
  hotkey: { preventDefault: true },
  hotkeySequence: { timeout: 1500, preventDefault: true },
};
