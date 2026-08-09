import { Box, Button, HStack, IconButton, Separator, Slider, Switch } from "@chakra-ui/react";
import { useSignal } from "@preact/signals-react";
import { PlaybackStatus } from "@tgb-resolver/contracts";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";
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

import {
  useControlAutoResolveEnabled,
  useControlAutoResolveSpeedMs,
  useControlCanMutate,
  useControlIsLive,
  useControlShowRows,
  useResetPlaybackMutation,
  useSeekPlaybackMutation,
  useStartPlaybackMutation,
  useToggleLiveModeMutation,
  useUpdateAutomationMutation,
} from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";
import { realtimeModel } from "@/features/shared/realtime-model";
import { Tooltip } from "@/features/shared/ui/tooltip";
import { useAction } from "@/lib/actions";

export function ControlMainControls() {
  const startPlayback = useStartPlaybackMutation();
  const resetPlayback = useResetPlaybackMutation();
  const seekPlayback = useSeekPlaybackMutation();
  const toggleLiveMode = useToggleLiveModeMutation();
  const isLive = useControlIsLive();
  const connectionStatus = realtimeModel.connectionStatus.value;
  const canMutate = useControlCanMutate();

  const autoResolveEnabled = useControlAutoResolveEnabled();
  const updateAutomation = useUpdateAutomationMutation();

  return (
    <HStack h={16} alignItems="center" borderTopWidth={1} gap={2} p={2}>
      <PlaybackTransportState
        canMutate={canMutate}
        startPlayback={startPlayback}
        resetPlayback={resetPlayback}
        seekPlayback={seekPlayback}
      />

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

      <SpeedSlider canMutate={canMutate} />

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

function PlaybackTransportState({
  canMutate,
  startPlayback,
  resetPlayback,
  seekPlayback,
}: {
  canMutate: boolean;
  startPlayback: ReturnType<typeof useStartPlaybackMutation>;
  resetPlayback: ReturnType<typeof useResetPlaybackMutation>;
  seekPlayback: ReturnType<typeof useSeekPlaybackMutation>;
}) {
  return (
    <>
      <IconButton
        loading={startPlayback.isPending}
        onClick={() => startPlayback.mutate()}
        disabled={!canMutate}
      >
        <PlayPauseIcon />
      </IconButton>
      <IconButton
        loading={resetPlayback.isPending}
        onClick={() => resetPlayback.mutate()}
        disabled={!canMutate}
      >
        <TimerReset />
      </IconButton>

      <SeekButtons canMutate={canMutate} seekPlayback={seekPlayback} />
    </>
  );
}

function PlayPauseIcon() {
  return playbackModel.status.value === PlaybackStatus.RUNNING ? <Pause /> : <Play />;
}

const SPEED_RATES = [0.2, 0.5, 1, 2, 5];

function SpeedSlider({ canMutate }: { canMutate: boolean }) {
  const autoResolveSpeedMs = useControlAutoResolveSpeedMs();
  const updateAutomation = useUpdateAutomationMutation();
  const dragValue = useSignal<number[]>([]);

  const rateIndex = (() => {
    const idx = SPEED_RATES.findIndex((r) => 3000 / r <= autoResolveSpeedMs);
    return idx >= 0 ? idx : SPEED_RATES.length - 1;
  })();

  return (
    <Slider.Root
      value={dragValue.value.length > 0 ? dragValue.value : [rateIndex]}
      min={0}
      max={4}
      step={1}
      onValueChange={(details) => {
        dragValue.value = details.value;
      }}
      onValueChangeEnd={({ value }) => {
        dragValue.value = [];
        updateAutomation.mutate({
          autoResolveSpeedMs: Math.round(3000 / SPEED_RATES[value[0]]),
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

        <Slider.ValueText>{SPEED_RATES[rateIndex]}x</Slider.ValueText>
      </HStack>
    </Slider.Root>
  );
}

function SeekButtons({
  canMutate,
  seekPlayback,
}: {
  canMutate: boolean;
  seekPlayback: ReturnType<typeof useSeekPlaybackMutation>;
}) {
  const rows = useControlShowRows();
  const currentEventId = playbackModel.currentEventId.value;
  const currentIndex =
    currentEventId != null ? rows.findIndex((row) => row.id === currentEventId) : -1;

  // Seeking is only meaningful while playing or paused; an idle timeline has
  // nothing to resume from, so the transport controls are disabled.
  const canSeek =
    playbackModel.status.value === PlaybackStatus.RUNNING ||
    playbackModel.status.value === PlaybackStatus.PAUSED;

  const prevAction = useAction({
    handler: () => {
      if (currentIndex > 0) {
        const prev = rows[currentIndex - 1];
        if (prev) seekPlayback.mutate(prev.id);
      }
    },
    enabled: canMutate && canSeek && currentIndex > 0 && !seekPlayback.isPending,
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
      canMutate &&
      canSeek &&
      currentIndex >= 0 &&
      currentIndex < rows.length - 1 &&
      !seekPlayback.isPending,
    hotkeys: ["ArrowRight", "Space"],
  });

  return (
    <>
      <IconButton {...prevAction.buttonProps}>
        <ChevronLeft />
      </IconButton>

      <IconButton {...nextAction.buttonProps}>
        <ChevronRight />
      </IconButton>
    </>
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
