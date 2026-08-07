import { Grid, VStack } from "@chakra-ui/react";

import { useControlShowRows } from "@/features/control/hooks";
import { playbackModel } from "@/features/control/playback-model";

import { CueContent } from "./cue-content";
import { CUE_CONFIG, Cue, CueItem } from "./cue-item";
import { NextCueTimer } from "./next-cue-timer";

export function ControlMainCueTab() {
  return (
    <Grid boxSize="full" templateRows="1fr auto repeat(2, 1fr)" p={4}>
      <CurrentEventCues />
    </Grid>
  );
}

function CurrentEventCues() {
  const rows = useControlShowRows();
  const currentCueId = playbackModel.currentCueId.value;
  const currentIndex = rows.findIndex((row) => row.id === currentCueId);

  if (currentIndex < 0) {
    return (
      <>
        <CueItem cue={Cue.CURRENT}>
          <CueContent cue={undefined} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
        </CueItem>
        <NextCueTimer />
        <CueItem cue={Cue.NEXT}>
          <CueContent cue={undefined} contentSize={CUE_CONFIG[Cue.NEXT].contentSize} />
        </CueItem>
        <CueItem cue={Cue.PREVIOUS}>
          <CueContent cue={undefined} contentSize={CUE_CONFIG[Cue.PREVIOUS].contentSize} />
        </CueItem>
      </>
    );
  }

  // Find current group parent (the event at or before currentIndex with no trigger offset)
  let parentIndex = currentIndex;
  while (parentIndex > 0 && rows[parentIndex].triggerOffsetSeconds != null) {
    parentIndex--;
  }
  const parentCue = rows[parentIndex];

  // Concurrent child events in this group up to currentIndex
  const concurrentChildren = rows.slice(parentIndex + 1, currentIndex + 1);
  const latestChild =
    concurrentChildren.length > 0 ? concurrentChildren[concurrentChildren.length - 1] : undefined;

  // Next group starts at the next event after current group that has no trigger offset
  let nextGroupIndex = currentIndex + 1;
  while (nextGroupIndex < rows.length && rows[nextGroupIndex].triggerOffsetSeconds != null) {
    nextGroupIndex++;
  }
  const nextCue = nextGroupIndex < rows.length ? rows[nextGroupIndex] : undefined;

  // Previous group starts at the parent event before parentIndex
  let prevGroupIndex = parentIndex - 1;
  while (prevGroupIndex > 0 && rows[prevGroupIndex].triggerOffsetSeconds != null) {
    prevGroupIndex--;
  }
  const previousCue =
    prevGroupIndex >= 0 && prevGroupIndex < parentIndex ? rows[prevGroupIndex] : undefined;

  return (
    <>
      <CueItem cue={Cue.CURRENT}>
        <VStack gap={2} alignItems="start">
          <CueContent cue={parentCue} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
          {latestChild && (
            <CueContent cue={latestChild} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
          )}
        </VStack>
      </CueItem>
      <NextCueTimer />
      <CueItem cue={Cue.NEXT}>
        <CueContent cue={nextCue} contentSize={CUE_CONFIG[Cue.NEXT].contentSize} />
      </CueItem>
      <CueItem cue={Cue.PREVIOUS}>
        <CueContent cue={previousCue} contentSize={CUE_CONFIG[Cue.PREVIOUS].contentSize} />
      </CueItem>
    </>
  );
}
