import { Box, Button, Grid, HStack, Show } from "@chakra-ui/react";
import { Play, TimerReset } from "lucide-react";
import { useControlElapsedTimeStore } from "@/stores/control-elapsed-time.store";

export default function ControlMainPanel() {
  const { startedAt, markStarted, resetStarted } = useControlElapsedTimeStore();
  const isStarted = startedAt !== null;

  return (
    <Grid templateRows="1fr auto" h="full">
      <Box flex={1} p={8}>
        Test
      </Box>
      <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
        <Button aspectRatio={1} disabled={isStarted} onClick={markStarted}>
          <Play />
        </Button>
        <Button aspectRatio={1} disabled={!isStarted} onClick={resetStarted}>
          <TimerReset />
        </Button>
      </HStack>
    </Grid>
  );
}
