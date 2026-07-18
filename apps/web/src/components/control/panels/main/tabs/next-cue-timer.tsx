import { HStack, Text } from "@chakra-ui/react";
import { type ReadonlySignal, useComputed, useSignal } from "@preact/signals-react";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

import { useControlShowRows } from "@/features/control/hooks";
import { currentEventIdSignal } from "@/features/control/playback-signals";
import { controlNowModel } from "@/models/control-now";

function formatRemaining(ms: number) {
  const clamped = Math.max(0, ms);

  return {
    minutes: String(Math.floor(clamped / 60_000)).padStart(2, "0"),
    seconds: String(Math.floor((clamped % 60_000) / 1000)).padStart(2, "0"),
    hundredMillis: String(Math.floor(Math.floor(clamped % 1000) / 100)),
  };
}

function NextCueRemaining({
  durations,
  eventStartedAt,
  now,
}: {
  durations: number[];
  eventStartedAt: ReadonlySignal<number>;
  now: ReadonlySignal<number>;
}) {
  const remainingMs = useComputed(() => {
    const elapsed = now.value - eventStartedAt.value;
    return durations.reduce((sum, d) => sum + Math.max(0, d * 1000 - elapsed), 0);
  });
  const mainText = useComputed(() => {
    const { minutes, seconds } = formatRemaining(remainingMs.value);
    return `${minutes}:${seconds}.`;
  });
  const hundredText = useComputed(() => formatRemaining(remainingMs.value).hundredMillis);

  return (
    <Text as="span" fontFamily="mono" fontVariantNumeric="tabular-nums" fontWeight="bold">
      <>{mainText}</>
      <Text as="span" fontSize="sm">
        <>{hundredText}</>
      </Text>
    </Text>
  );
}

export function NextCueTimer() {
  const rows = useControlShowRows();
  const currentEventId = currentEventIdSignal.value;
  const playingEvents = rows.filter(
    (row) => row.id === currentEventId && (row.durationSeconds ?? 0) > 0,
  );

  const playingKey = playingEvents.map((row) => row.id).join(",");
  const prevPlayingKeyRef = useRef<string>("");
  const eventStartedAt = useSignal(controlNowModel.now.peek());

  useEffect(() => {
    if (playingKey && playingKey !== prevPlayingKeyRef.current) {
      eventStartedAt.value = controlNowModel.now.peek();
      prevPlayingKeyRef.current = playingKey;
    }
  }, [playingKey, eventStartedAt]);

  if (playingEvents.length === 0) {
    return (
      <HStack gap={2} alignItems="center" py={4} fontSize="lg" fontFamily="mono">
        <ChevronDown />
        <Text as="span" color="fg.muted" fontVariantNumeric="tabular-nums">
          No active cue
        </Text>
      </HStack>
    );
  }

  const durations = playingEvents.map((row) => row.durationSeconds ?? 0);

  return (
    <HStack gap={2} alignItems="center" py={4} fontSize="lg" fontFamily="mono">
      <ChevronDown />
      Next cue in{" "}
      <NextCueRemaining
        durations={durations}
        eventStartedAt={eventStartedAt}
        now={controlNowModel.now}
      />
    </HStack>
  );
}
