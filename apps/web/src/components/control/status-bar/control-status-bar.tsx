import { Button, Grid, HStack } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";

import { ColorModeButton } from "@/components/ui/color-mode";
import { useControlNowStore } from "@/store/control-now";

import { ControlFullScreenButton } from "./control-full-screen-button";
import { ControlCurrentTime, ControlElapsedTime } from "./control-time";

export function ControlStatusBar() {
  const now = useControlNowStore((s) => s.now);

  return (
    <Grid templateColumns="1fr auto 1fr" h={16} px={2} borderBottomWidth={1} alignItems="center">
      <HStack h="full">
        <ControlFullScreenButton />
        <ControlCurrentTime now={now} />
      </HStack>
      <ControlElapsedTime now={now} />
      <HStack justifyContent="flex-end" h="full">
        <Button variant="outline" asChild>
          <Link to="/" target="_blank" rel="noopener noreferrer">
            Open audience view (new tab)
          </Link>
        </Button>
        <ColorModeButton />
      </HStack>
    </Grid>
  );
}
