import { Box, Button, Grid, HStack } from "@chakra-ui/react";
import { Play, TimerReset } from "lucide-react";
import { useResolveStore } from "@/stores/resolve.store";

export function ControlMainPanel() {
  const { start, reset, starting, resetting } = useResolveStore();

  return (
    <Grid templateRows="1fr auto" h="full">
      <Box flex={1} p={8}>
        Test
      </Box>
      <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
        <Button aspectRatio={1} loading={starting} onClick={start}>
          <Play />
        </Button>
        <Button aspectRatio={1} loading={resetting} onClick={reset}>
          <TimerReset />
        </Button>
      </HStack>
    </Grid>
  );
}
