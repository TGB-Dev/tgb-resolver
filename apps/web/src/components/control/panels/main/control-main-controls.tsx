import { Box, Button, HStack, IconButton, Separator, Slider, Switch } from "@chakra-ui/react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Pen,
  Play,
  Radio,
  RefreshCw,
  TimerReset,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";

import { PlaybackStatus } from "@tgb-resolver/contracts";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";

import { Tooltip } from "@/components/ui/tooltip";
import {
  useControlAutoResolveEnabled,
  useControlAutoResolveSpeedMs,
  useControlCanMutate,
  useControlIsLive,
  useControlShowQuery,
  useControlShowRows,
  useResetPlaybackMutation,
  useSeekPlaybackMutation,
  useStartPlaybackMutation,
  useToggleLiveModeMutation,
  useUpdateAutomationMutation,
} from "@/features/control/hooks";
import { useControlRealtime } from "@/features/control/realtime-provider";
import { useAction } from "@/lib/actions";

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
  const showQuery = useControlShowQuery();
  const playbackStatus = showQuery.data?.playback?.status;

  const autoResolveEnabled = useControlAutoResolveEnabled();
  const autoResolveSpeedMs = useControlAutoResolveSpeedMs();
  const updateAutomation = useUpdateAutomationMutation();

  const RATES = [0.2, 0.5, 1, 2, 5];
  const rateIndex = (() => {
    const idx = RATES.findIndex((r) => 3000 / r <= autoResolveSpeedMs);
    return idx >= 0 ? idx : RATES.length - 1;
  })();

  const [dragValue, setDragValue] = useState<number[]>([]);

  const prevAction = useAction({
    handler: () => {
      if (currentIndex > 0) {
        const prev = rows[currentIndex - 1];
        if (prev) seekPlayback.mutate(prev.id);
      }
    },
    enabled: canMutate && currentIndex > 0 && !seekPlayback.isPending,
    hotkeys: ["ArrowLeft"],
  });

  const nextAction = useAction({
    handler: () => {
      if (currentIndex >= 0 && currentIndex < rows.length - 1) {
        const next = rows[currentIndex + 1];
        if (next) seekPlayback.mutate(next.id);
      }
    },
    enabled:
      canMutate && currentIndex >= 0 && currentIndex < rows.length - 1 && !seekPlayback.isPending,
    hotkeys: ["ArrowRight", "Space"],
  });

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      <IconButton
        loading={startPlayback.isPending}
        onClick={() => startPlayback.mutate()}
        disabled={!canMutate}
      >
        {playbackStatus === PlaybackStatus.RUNNING ? <Pause /> : <Play />}
      </IconButton>
      <IconButton
        loading={resetPlayback.isPending}
        onClick={() => resetPlayback.mutate()}
        disabled={!canMutate}
      >
        <TimerReset />
      </IconButton>

      <IconButton {...prevAction.buttonProps}>
        <ChevronLeft />
      </IconButton>

      <IconButton {...nextAction.buttonProps}>
        <ChevronRight />
      </IconButton>

      <Separator orientation="vertical" size="sm" />

      <Switch.Root
        checked={autoResolveEnabled}
        onCheckedChange={({ checked }) => updateAutomation.mutate({ autoResolveEnabled: checked })}
        disabled={!canMutate || updateAutomation.isPending}
      >
        <Switch.Label>Autoplay</Switch.Label>
        <Switch.Control>
          <Switch.Thumb />
          <Switch.HiddenInput />
        </Switch.Control>
      </Switch.Root>

      <Slider.Root
        value={dragValue.length > 0 ? dragValue : [rateIndex]}
        min={0}
        max={4}
        step={1}
        onValueChange={(details) => setDragValue(details.value)}
        onValueChangeEnd={({ value }) => {
          setDragValue([]);
          updateAutomation.mutate({
            autoResolveSpeedMs: Math.round(3000 / RATES[value[0]]),
          });
        }}
        disabled={!canMutate || updateAutomation.isPending}
        width={32}
      >
        <HStack gap={4}>
          <Slider.Control>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumb index={0} />
          </Slider.Control>

          <Slider.ValueText>{RATES[rateIndex]}x</Slider.ValueText>
        </HStack>
      </Slider.Root>

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
    case ShowConnectionStatus.Connected:
      return "Connected";
    case ShowConnectionStatus.Connecting:
      return "Connecting";
    case ShowConnectionStatus.Reconnecting:
      return "Reconnecting...";
    case ShowConnectionStatus.Failed:
      return "Sync failed";
    case ShowConnectionStatus.Disconnected:
      return "Offline";
    default:
      return "Offline";
  }
}

function getConnectionStatusIcon(status: ShowConnectionStatus) {
  switch (status) {
    case ShowConnectionStatus.Connected:
      return <Wifi />;
    case ShowConnectionStatus.Connecting:
    case ShowConnectionStatus.Reconnecting:
      return <RefreshCw />;
    case ShowConnectionStatus.Failed:
      return <AlertTriangle />;
    default:
      return <WifiOff />;
  }
}
