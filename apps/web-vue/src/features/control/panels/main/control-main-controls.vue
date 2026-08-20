<script setup lang="ts">
import {
  SliderControl,
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  SliderValueText,
  SwitchControl,
  SwitchHiddenInput,
  SwitchLabel,
  SwitchRoot,
  SwitchThumb,
} from "@ark-ui/vue";
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
} from "@lucide/vue";
import { Box, HStack } from "@styled-system/jsx";
import { separator, slider, swittch } from "@styled-system/recipes";
import { PlaybackStatus } from "@tgb-resolver/contracts";
import { ShowConnectionStatus } from "@tgb-resolver/realtime";
import { computed, ref } from "vue";

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
} from "@/features/control/composables/use-show";
import { usePlaybackStore } from "@/features/control/playback-store";
import Button from "@/features/shared/ui/button.vue";
import IconButton from "@/features/shared/ui/icon-button.vue";
import Tooltip from "@/features/shared/ui/tooltip.vue";
import { useAction } from "@/lib/actions";
import { useRealtimeStore } from "@/stores/realtime-store";

const startPlayback = useStartPlaybackMutation();
const resetPlayback = useResetPlaybackMutation();
const seekPlayback = useSeekPlaybackMutation();
const toggleLiveMode = useToggleLiveModeMutation();
const isLive = useControlIsLive();
const realtimeStore = useRealtimeStore();
const playbackStore = usePlaybackStore();
const canMutate = useControlCanMutate();

const autoResolveEnabled = useControlAutoResolveEnabled();
const updateAutomation = useUpdateAutomationMutation();

const playbackStatus = computed(() => playbackStore.status);
const rows = useControlShowRows();
const currentEventId = computed(() => playbackStore.currentEventId);
const currentIndex = computed(() => {
  const id = currentEventId.value;
  return id != null ? rows.value.findIndex((row) => row.id === id) : -1;
});
const canSeek = computed(
  () =>
    playbackStatus.value === PlaybackStatus.RUNNING ||
    playbackStatus.value === PlaybackStatus.PAUSED,
);

const enablePrev = computed(
  () => canMutate.value && canSeek.value && currentIndex.value > 0 && !seekPlayback.isPending.value,
);
const enableNext = computed(
  () =>
    canMutate.value &&
    canSeek.value &&
    currentIndex.value >= 0 &&
    currentIndex.value < rows.value.length - 1 &&
    !seekPlayback.isPending.value,
);

const prevAction = useAction({
  handler: () => {
    if (currentIndex.value > 0) {
      const prev = rows.value[currentIndex.value - 1];
      if (prev) seekPlayback.mutate(prev.id);
    }
  },
  enabled: enablePrev,
  hotkeys: ["ArrowLeft"],
});

const nextAction = useAction({
  handler: () => {
    if (currentIndex.value >= 0 && currentIndex.value < rows.value.length - 1) {
      const next = rows.value[currentIndex.value + 1];
      if (next) seekPlayback.mutate(next.id);
    }
  },
  enabled: enableNext,
  hotkeys: ["ArrowRight", "Space"],
});

const SPEED_RATES = [0.2, 0.5, 1, 2, 5];
const autoResolveSpeedMs = useControlAutoResolveSpeedMs();
const dragValue = ref<number[]>([]);
const rateIndex = computed(() => {
  const idx = SPEED_RATES.findIndex((rate) => 3000 / rate <= autoResolveSpeedMs.value);
  return idx >= 0 ? idx : SPEED_RATES.length - 1;
});
const sliderValue = computed(() => (dragValue.value.length > 0 ? dragValue.value : [rateIndex.value]));
const sliderClasses = slider({ size: "sm", variant: "outline" });
const switchClasses = swittch({ size: "sm" });
const separatorClass = separator({ orientation: "vertical", size: "sm" });

function handleSpeedChange(details: { value: number[] }) {
  dragValue.value = details.value;
}

function handleSpeedChangeEnd(details: { value: number[] }) {
  dragValue.value = [];
  const rate = SPEED_RATES[details.value[0] as number];
  if (rate !== undefined) {
    updateAutomation.mutate({ autoResolveSpeedMs: Math.round(3000 / rate) });
  }
}

const connectionLabel = computed(() => getConnectionStatusLabel(realtimeStore.connectionStatus));

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
</script>

<template>
  <HStack h="16" alignItems="center" borderTopWidth="1" borderColor="border" gap="2" p="2" class="tgb-controls">
    <IconButton
      ariaLabel="Play or Pause"
      :disabled="!canMutate || startPlayback.isPending.value"
      @click="startPlayback.mutate()"
    >
      <Pause v-if="playbackStatus === PlaybackStatus.RUNNING" :size="16" aria-hidden />
      <Play v-else :size="16" aria-hidden />
    </IconButton>
    <IconButton
      ariaLabel="Reset playback"
      :disabled="!canMutate || resetPlayback.isPending.value"
      @click="resetPlayback.mutate()"
    >
      <TimerReset :size="16" aria-hidden />
    </IconButton>

    <IconButton v-bind="prevAction.buttonProps" ariaLabel="Previous event">
      <ChevronLeft :size="16" aria-hidden />
    </IconButton>
    <IconButton v-bind="nextAction.buttonProps" ariaLabel="Next event">
      <ChevronRight :size="16" aria-hidden />
    </IconButton>

    <Box :class="separatorClass" h="6" mx="1" aria-hidden />

    <SwitchRoot
      :checked="autoResolveEnabled"
      :disabled="!canMutate || updateAutomation.isPending.value"
      :class="switchClasses.root"
      @checked-change="(details) => updateAutomation.mutate({ autoResolveEnabled: details.checked })"
    >
      <SwitchLabel :class="switchClasses.label">Autoplay</SwitchLabel>
      <SwitchControl :class="switchClasses.control">
        <SwitchThumb :class="switchClasses.thumb" />
        <SwitchHiddenInput />
      </SwitchControl>
    </SwitchRoot>

    <SliderRoot
      :model-value="sliderValue"
      :min="0"
      :max="4"
      :step="1"
      :disabled="!canMutate || updateAutomation.isPending.value"
      w="32"
      :class="sliderClasses.root"
      @value-change="handleSpeedChange"
      @value-change-end="handleSpeedChangeEnd"
    >
      <HStack gap="4">
        <SliderControl :class="sliderClasses.control">
          <SliderTrack :class="sliderClasses.track">
            <SliderRange :class="sliderClasses.range" />
          </SliderTrack>
          <SliderThumb :index="0" :class="sliderClasses.thumb" />
        </SliderControl>
        <SliderValueText :class="sliderClasses.valueText">{{ SPEED_RATES[rateIndex] }}x</SliderValueText>
      </HStack>
    </SliderRoot>

    <Box flex="1" />

    <Tooltip :content="connectionLabel">
      <Button variant="ghost" disabled>
        <Wifi v-if="realtimeStore.connectionStatus === ShowConnectionStatus.Connected" :size="16" aria-hidden />
        <RefreshCw v-else-if="realtimeStore.connectionStatus === ShowConnectionStatus.Connecting || realtimeStore.connectionStatus === ShowConnectionStatus.Reconnecting" :size="16" aria-hidden />
        <AlertTriangle v-else-if="realtimeStore.connectionStatus === ShowConnectionStatus.Failed" :size="16" aria-hidden />
        <WifiOff v-else :size="16" aria-hidden />
        {{ connectionLabel }}
      </Button>
    </Tooltip>

    <Tooltip :content="isLive ? 'Switch to Edit Mode' : 'Switch to Live Mode'">
      <Button
        w="48"
        :variant="isLive ? 'solid' : 'outline'"
        :colorPalette="isLive ? 'red' : undefined"
        :disabled="!canMutate || toggleLiveMode.isPending.value"
        @click="toggleLiveMode.mutate()"
      >
        <Radio v-if="isLive" :size="16" aria-hidden />
        <Pen v-else :size="16" aria-hidden />
        <span>Current Mode: {{ isLive ? 'Live' : 'Edit' }}</span>
      </Button>
    </Tooltip>
  </HStack>
</template>
