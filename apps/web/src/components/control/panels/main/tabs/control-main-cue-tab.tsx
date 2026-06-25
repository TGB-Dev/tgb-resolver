import { Grid, type HeadingProps, HStack, Text, type TextProps, VStack } from "@chakra-ui/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Heading } from "@/components/ui/heading";

enum Cue {
  CURRENT,
  NEXT,
  PREVIOUS,
}

function getCueString(cue: Cue): string {
  switch (cue) {
    case Cue.CURRENT:
      return "Current";
    case Cue.NEXT:
      return "Next";
    case Cue.PREVIOUS:
      return "Previous";
    default:
      return "Unknown";
  }
}

function getCueHeadingSize(cue: Cue): HeadingProps["fontSize"] {
  switch (cue) {
    case Cue.CURRENT:
      return "3xl";
    case Cue.NEXT:
      return "2xl";
    case Cue.PREVIOUS:
      return "xl";
    default:
      return "md";
  }
}

function getCueContentSize(cue: Cue): TextProps["fontSize"] {
  switch (cue) {
    case Cue.CURRENT:
      return "2xl";
    case Cue.NEXT:
      return "xl";
    case Cue.PREVIOUS:
      return "lg";
    default:
      return "sm";
  }
}

export function ControlMainCueTab() {
  return (
    <Grid boxSize="full" templateRows="1fr auto repeat(2, 1fr)" p={4}>
      <CueItem cue={Cue.CURRENT}>This is the current cue content.</CueItem>
      <NextCueTimer />
      <CueItem cue={Cue.NEXT}>This is the next cue content.</CueItem>
      <CueItem cue={Cue.PREVIOUS}>This is the previous cue content.</CueItem>
    </Grid>
  );
}

interface CueItemProps {
  cue: Cue;
  children: string;
}

function CueItem({ cue, children }: CueItemProps) {
  return (
    <VStack gap={4} alignItems="start">
      <Heading fontSize={getCueHeadingSize(cue)}>{getCueString(cue)}</Heading>
      <Text fontSize={getCueContentSize(cue)} textTransform="uppercase" overflowWrap="break-word">
        {children}
      </Text>
    </VStack>
  );
}

// TODO: to be replaced with the actual event timing from the timeline, this is just a placeholder for now
const DURATION_MS = 10_000;

function formatRemaining(ms: number) {
  const clamped = Math.max(0, ms);

  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const hundredMillis = Math.floor(Math.floor(clamped % 1000) / 100);

  return {
    minutes: String(minutes).padStart(2, "0"),
    seconds: String(seconds).padStart(2, "0"),
    hundredMillis: String(hundredMillis),
  };
}

export function NextCueTimer() {
  const [remainingMs, setRemainingMs] = useState(DURATION_MS);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = performance.now();

    const tick = (now: number) => {
      if (startedAtRef.current === null) return;

      const elapsed = (now - startedAtRef.current) % DURATION_MS;
      setRemainingMs(DURATION_MS - elapsed);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const { minutes, seconds, hundredMillis } = formatRemaining(remainingMs);

  return (
    <HStack gap={2} alignItems="center" py={4} fontSize="lg">
      {/* TODO: pulse the icon on THRESHOLD left*/}
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
