import { HotkeysProvider } from "@tanstack/react-hotkeys";
import type * as React from "react";
import { Provider as ChakraProvider } from "@/components/ui/provider.tsx";
import TanStackQueryProvider from "@/integrations/tanstack-query/root-provider.tsx";

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
