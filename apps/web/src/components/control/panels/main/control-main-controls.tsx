import { Box, Button, HStack, IconButton } from "@chakra-ui/react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
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
  useControlShowRows,
  useResetPlaybackMutation,
  useSeekPlaybackMutation,
  useStartPlaybackMutation,
  useToggleLiveModeMutation,
} from "@/features/control/hooks";
import { useControlRealtime } from "@/features/control/realtime-provider";
import type { ShowConnectionStatus } from "@/lib/api";

export function ControlMainControls() {
  const startPlayback = useStartPlaybackMutation();
  const resetPlayback = useResetPlaybackMutation();
  const seekPlayback = useSeekPlaybackMutation();
  const toggleLiveMode = useToggleLiveModeMutation();
  const isLive = useControlIsLive();
  const rows = useControlShowRows();
  const { connectionStatus } = useControlRealtime();
  const canMutate = useControlCanMutate();
  const currentIndex = rows.findIndex((row) => row.isCurrentResolve || row.isCurrentInlineEvent);

  function goPrevious() {
    if (currentIndex > 0) {
      const prev = rows[currentIndex - 1];
      if (prev) seekPlayback.mutate(prev.id);
    }
  }

  function goNext() {
    if (currentIndex >= 0 && currentIndex < rows.length - 1) {
      const next = rows[currentIndex + 1];
      if (next) seekPlayback.mutate(next.id);
    }
  }

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

      <IconButton
        onClick={goPrevious}
        disabled={!canMutate || currentIndex <= 0 || seekPlayback.isPending}
        variant="ghost"
      >
        <ChevronLeft />
      </IconButton>

      <IconButton
        onClick={goNext}
        disabled={
          !canMutate ||
          currentIndex < 0 ||
          currentIndex >= rows.length - 1 ||
          seekPlayback.isPending
        }
        variant="ghost"
      >
        <ChevronRight />
      </IconButton>

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
