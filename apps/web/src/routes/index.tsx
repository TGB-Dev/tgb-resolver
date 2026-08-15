import { Box } from "@chakra-ui/react";
import { useHotkeys } from "@tanstack/react-hotkeys";
import { createFileRoute } from "@tanstack/react-router";

import { ControlRealtimeProvider } from "@/features/control/realtime-provider";
import { Resolve } from "@/features/leaderboard/leaderboard";
import { fullscreenModel } from "@/features/shared/full-screen-model";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  useHotkeys([{ hotkey: "F", callback: () => void fullscreenModel.toggleFullscreen() }]);

  return (
    <ControlRealtimeProvider>
      <Box position="relative">
        <Box h="dvh" overflowY="auto" css={{ overflowAnchor: "none" }} data-audience-scroll>
          <Resolve isBigScreen />
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
