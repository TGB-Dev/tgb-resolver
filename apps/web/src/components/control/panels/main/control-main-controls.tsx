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
import { useControlStore } from "@/stores/control.store";
import { useResolveStore } from "@/stores/resolve.store";

export function ControlMainControls() {
  const { start, reset, starting, resetting } = useResolveStore();
  const isLive = useControlStore((state) => state.show?.mode === "live");
  const toggleLiveMode = useControlStore((state) => state.toggleLiveMode);
  const connectionStatus = useControlStore((state) => state.connectionStatus);
  const canMutate = useControlStore((state) => state.canMutate);

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

function getConnectionStatusLabel(
  status: ReturnType<typeof useControlStore.getState>["connectionStatus"],
) {
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

function getConnectionStatusIcon(
  status: ReturnType<typeof useControlStore.getState>["connectionStatus"],
) {
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
