import { Grid } from "@chakra-ui/react";

import { useControlShowRows } from "@/features/control/hooks";
import {
  currentEventIdSignal,
  currentResolveEventIdSignal,
} from "@/features/control/playback-signals";

import { CueContent } from "./cue-content";
import { CUE_CONFIG, Cue, CueItem } from "./cue-item";
import { currentCue } from "./cue-selection";
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
  const currentEventId = currentEventIdSignal.value;
  const currentResolveEventId = currentResolveEventIdSignal.value;
  const currentIndex =
    currentEventId != null ? rows.findIndex((row) => row.id === currentEventId) : -1;
  const current = currentCue(rows, currentEventId, currentResolveEventId);
  const next = rows[currentIndex >= 0 ? currentIndex + 1 : 0];
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
