import { Grid } from "@chakra-ui/react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

import { useControlShowRows } from "@/features/control/hooks";
import { playbackSignal } from "@/models/playback-state";

import { CueContent } from "./cue-content";
import { CUE_CONFIG, Cue, CueItem } from "./cue-item";
import { NextCueTimer } from "./next-cue-timer";

function cuePriority(type: TimelineEventType): number {
  if (type === TimelineEventType.RES) return 0;
  if (type === TimelineEventType.PRE) return 1;
  return 2;
}

function currentCue(
  rows: TimelineTableItem[],
  currentIndex: number,
): TimelineTableItem | undefined {
  if (currentIndex < 0) return undefined;
  const current = rows[currentIndex];
  // On concurrent plays, prefer RES/PRE. The reliable current event (resolved via
  // currentEventId) is always included; flag-staleness is avoided by only
  // considering playing events adjacent (±1) to it.
  const concurrent = rows.filter(
    (row) =>
      (row.isCurrentResolve || row.isCurrentInlineEvent) &&
      row.id !== current.id &&
      Math.abs(rows.indexOf(row) - currentIndex) <= 1,
  );
  if (concurrent.length === 0) return current;
  return [current, ...concurrent].sort((a, b) => cuePriority(a.type) - cuePriority(b.type))[0];
}

export function ControlMainCueTab() {
  return (
    <Grid boxSize="full" templateRows="1fr auto repeat(2, 1fr)" p={4}>
      <CurrentEventCues />
    </Grid>
  );
}

function CurrentEventCues() {
  const rows = useControlShowRows();
  const currentEventId = playbackSignal.value.currentEventId;
  const currentIndex =
    currentEventId != null ? rows.findIndex((row) => row.id === currentEventId) : -1;
  const current = currentCue(rows, currentIndex);
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
