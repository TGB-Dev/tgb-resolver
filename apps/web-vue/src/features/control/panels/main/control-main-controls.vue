<script setup lang="ts">
import { Slider, Switch } from "@ark-ui/vue";
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
import { css, cx } from "@styled-system/css";
import { button, iconButton, separator, slider, swittch } from "@styled-system/recipes";
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
const sliderClasses = slider();
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
  <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', h: '16', borderTopWidth: 1, borderColor: 'border', gap: '2', p: '2' })" class="tgb-controls">
    <button
      type="button"
      aria-label="Play or Pause"
      :class="cx(button(), iconButton())"
      :disabled="!canMutate || startPlayback.isPending.value"
      @click="startPlayback.mutate()"
    >
      <Pause v-if="playbackStatus === PlaybackStatus.RUNNING" :size="16" aria-hidden />
      <Play v-else :size="16" aria-hidden />
    </button>
    <button
      type="button"
      aria-label="Reset playback"
      :class="cx(button(), iconButton())"
      :disabled="!canMutate || resetPlayback.isPending.value"
      @click="resetPlayback.mutate()"
    >
      <TimerReset :size="16" aria-hidden />
    </button>

    <button
      type="button"
      :aria-label="'Previous event'"
      :class="cx(button(), iconButton())"
      :disabled="!enablePrev"
      @click="prevAction.execute()"
    >
      <ChevronLeft :size="16" aria-hidden />
    </button>
    <button
      type="button"
      :aria-label="'Next event'"
      :class="cx(button(), iconButton())"
      :disabled="!enableNext"
      @click="nextAction.execute()"
    >
      <ChevronRight :size="16" aria-hidden />
    </button>

    <div :class="[separatorClass, css({ h: '6', mx: 1 })]" aria-hidden />

    <Switch.Root
      :checked="autoResolveEnabled"
      :disabled="!canMutate || updateAutomation.isPending.value"
      :class="switchClasses.root"
      @checked-change="(details) => updateAutomation.mutate({ autoResolveEnabled: details.checked })"
    >
      <Switch.Label :class="switchClasses.label">Autoplay</Switch.Label>
      <Switch.Control :class="switchClasses.control">
        <Switch.Thumb :class="switchClasses.thumb" />
        <Switch.HiddenInput />
      </Switch.Control>
    </Switch.Root>

    <Slider.Root
      :model-value="sliderValue"
      :min="0"
      :max="4"
      :step="1"
      :disabled="!canMutate || updateAutomation.isPending.value"
      :class="cx(sliderClasses.root, css({ width: '32' }))"
      @value-change="handleSpeedChange"
      @value-change-end="handleSpeedChangeEnd"
    >
      <div :class="css({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4' })">
        <Slider.Control :class="sliderClasses.control">
          <Slider.Track :class="sliderClasses.track">
            <Slider.Range :class="sliderClasses.range" />
          </Slider.Track>
          <Slider.Thumb :index="0" :class="sliderClasses.thumb" />
        </Slider.Control>
        <Slider.ValueText :class="sliderClasses.valueText">{{ SPEED_RATES[rateIndex] }}x</Slider.ValueText>
      </div>
    </Slider.Root>

    <div :class="css({ flex: 1 })" />

    <Tooltip :content="connectionLabel">
      <button type="button" :class="button({ variant: 'ghost' })" disabled>
        <Wifi v-if="realtimeStore.connectionStatus === ShowConnectionStatus.Connected" :size="16" aria-hidden />
        <RefreshCw v-else-if="realtimeStore.connectionStatus === ShowConnectionStatus.Connecting || realtimeStore.connectionStatus === ShowConnectionStatus.Reconnecting" :size="16" aria-hidden />
        <AlertTriangle v-else-if="realtimeStore.connectionStatus === ShowConnectionStatus.Failed" :size="16" aria-hidden />
        <WifiOff v-else :size="16" aria-hidden />
        {{ connectionLabel }}
      </button>
    </Tooltip>

    <Tooltip :content="isLive ? 'Switch to Edit Mode' : 'Switch to Live Mode'">
      <button
        type="button"
        :class="
          cx(
            button({ variant: isLive ? 'solid' : 'outline' }),
            css({ w: '48', colorPalette: isLive ? 'red' : undefined }),
          )
        "
        :disabled="!canMutate || toggleLiveMode.isPending.value"
        @click="toggleLiveMode.mutate()"
      >
        <Radio v-if="isLive" :size="16" aria-hidden />
        <Pen v-else :size="16" aria-hidden />
        <span>Current Mode: {{ isLive ? 'Live' : 'Edit' }}</span>
      </button>
    </Tooltip>
  </div>
</template>
