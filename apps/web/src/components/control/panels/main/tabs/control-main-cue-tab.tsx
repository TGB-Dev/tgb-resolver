import { Grid } from "@chakra-ui/react";

import { useControlShowRows } from "@/features/control/hooks";
import { playbackModel } from "@/models";

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
  const next =
    currentIndex >= 0 && currentIndex < rows.length - 1 ? rows[currentIndex + 1] : undefined;
  const previous = currentIndex > 0 ? rows[currentIndex - 1] : undefined;

  return (
    <>
      <CueItem cue={Cue.CURRENT}>
        <CueContent cue={current} contentSize={CUE_CONFIG[Cue.CURRENT].contentSize} />
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
