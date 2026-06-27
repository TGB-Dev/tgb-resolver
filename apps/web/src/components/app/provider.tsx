import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { Provider as JotaiProvider } from "jotai";
import type * as React from "react";

import { Provider as ChakraProvider } from "@/components/ui/provider.tsx";
import { TanStackQueryProvider } from "@/integrations/tanstack-query/root-provider.tsx";
import { appStore } from "@/state/control";

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <JotaiProvider store={appStore}>
      <TanStackQueryProvider>
        <HotkeysProvider
          defaultOptions={{
            hotkey: { preventDefault: true },
            hotkeySequence: { timeout: 1500 },
          }}
        >
          <ChakraProvider>{children}</ChakraProvider>
        </HotkeysProvider>
      </TanStackQueryProvider>
    </JotaiProvider>
  );
}
