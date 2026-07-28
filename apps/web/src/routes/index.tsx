import { Box } from "@chakra-ui/react";
import { createFileRoute } from "@tanstack/react-router";

import { Resolve } from "@/components/resolve/resolve";
import { ControlRealtimeProvider } from "@/features/control/realtime-provider";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <ControlRealtimeProvider>
      <Box position="relative">
        <Box h="dvh" overflowY="auto" css={{ overflowAnchor: "none" }}>
          <Resolve />
        </Box>

        {/* Overlay to prevent manual interaction to the resolve leaderboard by absorbing all the things */}
        <Box
          position="absolute"
          top={0}
          left={0}
          w="full"
          h="full"
          overflow="hidden"
          pointerEvents="auto"
          zIndex={9999}
        />
      </Box>
    </ControlRealtimeProvider>
  );
}
