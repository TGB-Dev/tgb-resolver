import { Box, Button, HStack, IconButton } from "@chakra-ui/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  AlertTriangle,
  Pen,
  Play,
  Radio,
  RefreshCw,
  TimerReset,
  Wifi,
  WifiOff,
} from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import type { ShowConnectionStatus } from "@/lib/api";
import {
  controlCanMutateAtom,
  controlConnectionStatusAtom,
  controlIsLiveAtom,
  toggleControlLiveModeAtom,
} from "@/state/control";
import {
  resetResolveAtom,
  resolveResettingAtom,
  resolveStartingAtom,
  startResolveAtom,
} from "@/state/resolve";

export function ControlMainControls() {
  const start = useSetAtom(startResolveAtom);
  const reset = useSetAtom(resetResolveAtom);
  const toggleLiveMode = useSetAtom(toggleControlLiveModeAtom);
  const starting = useAtomValue(resolveStartingAtom);
  const resetting = useAtomValue(resolveResettingAtom);
  const isLive = useAtomValue(controlIsLiveAtom);
  const connectionStatus = useAtomValue(controlConnectionStatusAtom);
  const canMutate = useAtomValue(controlCanMutateAtom);

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      <IconButton loading={starting} onClick={start} disabled={!canMutate}>
        <Play />
      </IconButton>
      <IconButton loading={resetting} onClick={reset} disabled={!canMutate}>
        <TimerReset />
      </IconButton>

      <Box flex={1} />

      <Tooltip content={getConnectionStatusLabel(connectionStatus)}>
        <Button variant="ghost" disabled>
          {getConnectionStatusIcon(connectionStatus)}
          {getConnectionStatusLabel(connectionStatus)}
        </Button>
      </Tooltip>

      <Tooltip content={isLive ? "Switch to Edit Mode" : "Switch to Live Mode"}>
        <Button
          w={48}
          variant={isLive ? "solid" : "outline"}
          colorPalette={isLive ? "red" : "colorPalette"}
          onClick={toggleLiveMode}
          disabled={!canMutate}
        >
          {isLive ? <Radio /> : <Pen />}
          Current Mode: {isLive ? "Live" : "Edit"}
        </Button>
      </Tooltip>
    </HStack>
  );
}

function getConnectionStatusLabel(status: ShowConnectionStatus) {
  switch (status) {
    case "connected":
      return "Connected";
    case "connecting":
      return "Connecting";
    case "reconnecting":
      return "Reconnecting...";
    case "failed":
      return "Sync failed";
    case "disconnected":
      return "Offline";
    default:
      return "Offline";
  }
}

function getConnectionStatusIcon(status: ShowConnectionStatus) {
  switch (status) {
    case "connected":
      return <Wifi />;
    case "connecting":
    case "reconnecting":
      return <RefreshCw />;
    case "failed":
      return <AlertTriangle />;
    default:
      return <WifiOff />;
  }
}
