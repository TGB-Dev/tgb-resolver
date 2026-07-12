import { Button, Grid, HStack } from "@chakra-ui/react";
import { Link } from "@tanstack/react-router";
import { useAtomValue } from "jotai";

import { ColorModeButton } from "@/components/ui/color-mode";
import { controlNowAtom } from "@/state/control-now";

import { ControlFullScreenButton } from "./control-full-screen-button";
import { ControlCurrentTime, ControlElapsedTime } from "./control-time";

export function ControlStatusBar() {
  const now = useAtomValue(controlNowAtom);

  return (
    <Grid templateColumns="1fr auto 1fr" h={16} px={2} borderBottomWidth={1} alignItems="center">
      {/* Full screen button + Current time */}
      <HStack h="full">
        <ControlFullScreenButton />
        <ControlCurrentTime now={now} />
      </HStack>

      {/* Elapsed time */}
      <ControlElapsedTime now={now} />

      {/* Color mode button (for admins only) */}
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
