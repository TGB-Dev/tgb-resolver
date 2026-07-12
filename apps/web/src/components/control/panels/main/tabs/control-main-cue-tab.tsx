import { Grid, HStack, Text, type TextProps, VStack } from "@chakra-ui/react";
import { PlaybackStatus } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Heading } from "@/components/ui/heading";
import { useControlShowQuery, useControlShowRows } from "@/features/control/hooks";
import { controlNowAtom } from "@/state/control-now";

enum Cue {
  CURRENT,
  NEXT,
  PREVIOUS,
}

const CUE_CONFIG: Record<
  Cue,
  { label: string; headingSize: TextProps["fontSize"]; contentSize: TextProps["fontSize"] }
> = {
  [Cue.CURRENT]: { label: "Current", headingSize: "3xl", contentSize: "2xl" },
  [Cue.NEXT]: { label: "Next", headingSize: "2xl", contentSize: "xl" },
  [Cue.PREVIOUS]: { label: "Previous", headingSize: "xl", contentSize: "lg" },
};

export function ControlMainCueTab() {
  const rows = useControlShowRows();
  const currentIndex = rows.findIndex((row) => row.isCurrentResolve || row.isCurrentInlineEvent);
  const current = currentIndex >= 0 ? rows[currentIndex] : undefined;
  const next = rows[currentIndex >= 0 ? currentIndex + 1 : 0];
  const previous = currentIndex > 0 ? rows[currentIndex - 1] : undefined;

  return (
    <Grid boxSize="full" templateRows="1fr auto repeat(2, 1fr)" p={4}>
      <CueItem cue={Cue.CURRENT}>{formatCue(current, Cue.CURRENT)}</CueItem>
      <NextCueTimer />
      <CueItem cue={Cue.NEXT}>{formatCue(next, Cue.NEXT)}</CueItem>
      <CueItem cue={Cue.PREVIOUS}>{formatCue(previous, Cue.PREVIOUS)}</CueItem>
    </Grid>
  );
}

function formatCue(cue: TimelineTableItem | undefined, cueEnum: Cue): ReactNode {
  if (!cue) {
    return <Text color="fg.muted">-</Text>;
  }

  const contentSize = CUE_CONFIG[cueEnum].contentSize;
  const textProps: TextProps = { fontFamily: "mono", fontSize: contentSize, as: "span" };

  if (!cue.problem) {
    return <Text fontFamily="mono">{cue.name}</Text>;
  }

  const oldScore = cue.oldScore;
  const oldRank = cue.oldRank;
  const newScore = cue.newScore;
  const newRank = cue.newRank;
  const hasOld =
    oldScore !== undefined &&
    oldRank !== undefined &&
    newScore !== undefined &&
    newRank !== undefined;

  return (
    <Text as="span">
      {cue.name},{" "}
      <Text {...textProps} color="fg.success">
        {cue.problem}
      </Text>
      {hasOld ? (
        <>
          {" "}
          | Score <Text {...textProps}>{oldScore}</Text> to{" "}
          <Text {...textProps} color="fg.success">
            {newScore}
          </Text>{" "}
          (+{newScore - oldScore}) | Rank <Text {...textProps}>{oldRank}</Text> to{" "}
          <Text {...textProps} color="fg.success">
            {newRank}
          </Text>
          {oldRank - newRank > 0 ? ` (+${oldRank - newRank})` : ""}
        </>
      ) : null}
    </Text>
  );
}

interface CueItemProps {
  cue: Cue;
  children: ReactNode;
}

function CueItem({ cue, children }: CueItemProps) {
  const config = CUE_CONFIG[cue];

  return (
    <VStack gap={4} alignItems="start">
      <Heading fontSize={config.headingSize}>{config.label}</Heading>
      <Text
        fontSize={config.contentSize}
        fontFamily="mono"
        textTransform="uppercase"
        overflowWrap="break-word"
        lineHeight="1.6"
      >
        {children}
      </Text>
    </VStack>
  );
}

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
    if (
      !isRunning ||
      startedAt === undefined ||
      durationSeconds === undefined ||
      durationSeconds <= 0
    ) {
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
