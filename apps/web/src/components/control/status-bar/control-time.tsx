import { Text } from "@chakra-ui/react";
import { type ReadonlySignal, useComputed } from "@preact/signals-react";

import { playbackModel } from "@/models";

function formatHms(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour12: false });
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.max(0, Math.floor(totalSeconds / 3600));
  const minutes = Math.max(0, Math.floor((totalSeconds % 3600) / 60));
  const seconds = Math.max(0, totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function ControlCurrentTime({ now }: { now: ReadonlySignal<number> }) {
  const formatted = useComputed(() => formatHms(new Date(now.value)));

  return (
    <Text fontFamily="mono" fontVariantNumeric="tabular-nums">
      <>{formatted}</>
    </Text>
  );
}

export function ControlElapsedTime({ now }: { now: ReadonlySignal<number> }) {
  const isStarted = useComputed(() => playbackModel.state.value.startedAt != null);
  const elapsedText = useComputed(() => {
    const startedAt = playbackModel.state.value.startedAt;
    const elapsedMs = startedAt != null ? now.value - startedAt : 0;
    return startedAt != null ? formatElapsed(elapsedMs) : "--:--:--";
  });

  return (
    <Text
      fontSize="3xl"
      fontFamily="mono"
      fontVariantNumeric="tabular-nums"
      opacity={isStarted.value ? 1 : 0.5}
    >
      <>T+{elapsedText}</>
    </Text>
  );
}
