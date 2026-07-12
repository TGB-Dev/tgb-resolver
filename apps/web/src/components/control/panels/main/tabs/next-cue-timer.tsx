import { ChevronDown } from "lucide-react";
import { useAtomValue } from "jotai";
import { HStack, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import { PlaybackStatus } from "@tgb-resolver/contracts";
import { useControlShowQuery, useControlShowRows } from "@/features/control/hooks";
import { controlNowAtom } from "@/state/control-now";

function formatRemaining(ms: number) {
  const clamped = Math.max(0, ms);

  return {
    minutes: String(Math.floor(clamped / 60_000)).padStart(2, "0"),
    seconds: String(Math.floor((clamped % 60_000) / 1000)).padStart(2, "0"),
    hundredMillis: String(Math.floor(Math.floor(clamped % 1000) / 100)),
  };
}

export function NextCueTimer() {
  const showQuery = useControlShowQuery();
  const rows = useControlShowRows();
  const playback = showQuery.data?.playback;
  const currentIndex = rows.findIndex((row) => row.isCurrentResolve || row.isCurrentInlineEvent);
  const nextEvent = currentIndex >= 0 ? rows[currentIndex + 1] : undefined;
  const durationSeconds = nextEvent?.durationSeconds;
  const startedAt = playback?.startedAt ?? undefined;
  const isRunning = playback?.status === PlaybackStatus.RUNNING;
  const now = useAtomValue(controlNowAtom);

  const remainingMs = useMemo(() => {
    if (!isRunning || startedAt === undefined || durationSeconds === undefined || durationSeconds <= 0) {
      return 0;
    }

    return Math.max(0, durationSeconds * 1000 - (now - startedAt));
  }, [isRunning, startedAt, durationSeconds, now]);

  if (!nextEvent || durationSeconds === undefined || durationSeconds <= 0) {
    return (
      <HStack gap={2} alignItems="center" py={4} fontSize="lg" fontFamily="mono">
        <ChevronDown />
        <Text as="span" color="fg.muted" fontVariantNumeric="tabular-nums">
          No duration
        </Text>
      </HStack>
    );
  }

  const { minutes, seconds, hundredMillis } = formatRemaining(remainingMs);

  return (
    <HStack gap={2} alignItems="center" py={4} fontSize="lg" fontFamily="mono">
      <ChevronDown />
      Next cue in{" "}
      <Text as="span" fontFamily="mono" fontVariantNumeric="tabular-nums">
        {minutes}:{seconds}.
        <Text as="span" fontSize="sm">
          {hundredMillis}
        </Text>
      </Text>
    </HStack>
  );
}
