import { Box, Button, HStack, IconButton } from "@chakra-ui/react";
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
import {
  useControlCanMutate,
  useControlIsLive,
  useResetPlaybackMutation,
  useStartPlaybackMutation,
  useToggleLiveModeMutation,
} from "@/features/control/hooks";
import { useControlRealtime } from "@/features/control/realtime-provider";
import type { ShowConnectionStatus } from "@/lib/api";

export function ControlMainControls() {
  const startPlayback = useStartPlaybackMutation();
  const resetPlayback = useResetPlaybackMutation();
  const toggleLiveMode = useToggleLiveModeMutation();
  const isLive = useControlIsLive();
  const { connectionStatus } = useControlRealtime();
  const canMutate = useControlCanMutate();

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      <IconButton
        loading={startPlayback.isPending}
        onClick={() => startPlayback.mutate()}
        disabled={!canMutate}
      >
        <Play />
      </IconButton>
      <IconButton
        loading={resetPlayback.isPending}
        onClick={() => resetPlayback.mutate()}
        disabled={!canMutate}
      >
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
          onClick={() => toggleLiveMode.mutate()}
          disabled={!canMutate || toggleLiveMode.isPending}
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
