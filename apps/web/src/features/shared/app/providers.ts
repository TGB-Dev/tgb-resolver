import type { HotkeysProviderOptions } from "@tanstack/vue-hotkeys";
import { MutationCache, QueryCache, QueryClient } from "@tanstack/vue-query";

import { isAuthError, useAuthStore } from "@/stores/auth-store";

function handleCacheError(error: unknown) {
  if (isAuthError(error)) {
    useAuthStore().markExpired();
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleCacheError,
  }),
  mutationCache: new MutationCache({
    onError: handleCacheError,
  }),
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
