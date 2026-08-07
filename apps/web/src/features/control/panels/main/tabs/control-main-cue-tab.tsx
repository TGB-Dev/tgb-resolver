import { Grid, VStack } from "@chakra-ui/react";
import { For } from "@preact/signals-react/utils";

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
  const current = currentIndex >= 0 ? rows[currentIndex] : undefined;
  const concurrentChildren = rows.filter((row) => row.isActive && row.id !== currentCueId);
  const next =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? rows[currentIndex + 1] : undefined;
  const previous = currentIndex > 0 ? rows[currentIndex - 1] : undefined;

  return (
    <>
      <CueItem cue={Cue.CURRENT}>
        <VStack gap={2} alignItems="start">
          <CueContent cue={current} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
          {concurrentChildren.length > 0 && (
            <For each={concurrentChildren}>
              {(child) => (
                <CueContent cue={child} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
              )}
            </For>
          )}
        </VStack>
      </CueItem>
      <NextCueTimer />
      <CueItem cue={Cue.NEXT}>
        <CueContent cue={next} contentSize={CUE_CONFIG[Cue.NEXT].contentSize} />
      </CueItem>
      <CueItem cue={Cue.PREVIOUS}>
        <CueContent cue={previous} contentSize={CUE_CONFIG[Cue.PREVIOUS].contentSize} />
      </CueItem>
    </>
  );
}
