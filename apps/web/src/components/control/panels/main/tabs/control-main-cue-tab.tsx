import { Grid } from "@chakra-ui/react";

import { useControlShowRows } from "@/features/control/hooks";

import { CueContent } from "./cue-content";
import { CUE_CONFIG, Cue, CueItem } from "./cue-item";
import { NextCueTimer } from "./next-cue-timer";

export function ControlMainCueTab() {
  const rows = useControlShowRows();
  const currentIndex = rows.findIndex((row) => row.isCurrentResolve || row.isCurrentInlineEvent);
  const current = currentIndex >= 0 ? rows[currentIndex] : undefined;
  const next = rows[currentIndex >= 0 ? currentIndex + 1 : 0];
  const previous = currentIndex > 0 ? rows[currentIndex - 1] : undefined;

  return (
    <Grid boxSize="full" templateRows="1fr auto repeat(2, 1fr)" p={4}>
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
    </Grid>
  );
}
