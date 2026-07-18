import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Provider as ChakraProvider } from "@/components/ui/provider";

const queryClient = new QueryClient();

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <HotkeysProvider
        defaultOptions={{
          hotkey: { preventDefault: true },
          hotkeySequence: { timeout: 1500 },
        }}
      >
        <ChakraProvider>{children}</ChakraProvider>
      </HotkeysProvider>
    </QueryClientProvider>
  );
}
