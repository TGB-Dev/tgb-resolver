import { Text, type TextProps } from "@chakra-ui/react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";

import { verdictColorCode, verdictShortCode } from "@/lib/verdict";

interface CueContentProps {
  cue: TimelineTableItem | undefined;
  contentSize: TextProps["fontSize"];
}

export function CueContent({ cue, contentSize }: CueContentProps) {
  if (!cue) {
    return <Text color="fg.muted">-</Text>;
  }

  const textProps: TextProps = { fontFamily: "mono", fontSize: contentSize, as: "span" };

  if (cue.type === TimelineEventType.RES) {
    return <ResolveContent cue={cue} textProps={textProps} />;
  }

  if (cue.type === TimelineEventType.PRE) {
    return <ResolveContent cue={cue} textProps={textProps} />;
  }

  const resolvedName = cue.customName ?? cue.name;

  if (cue.type === TimelineEventType.IMG) {
    return (
      <Text as="span">
        {resolvedName}
        {cue.durationSeconds !== undefined ? ` (${cue.durationSeconds}s)` : null}
      </Text>
    );
  }

  if (cue.type === TimelineEventType.SFX) {
    return (
      <Text as="span">
        {resolvedName}
        {cue.durationSeconds !== undefined ? ` (${cue.durationSeconds}s)` : null}
      </Text>
    );
  }

  return <Text fontFamily="mono">{resolvedName}</Text>;
}

interface ResolveContentProps {
  cue: TimelineTableItem;
  textProps: TextProps;
}

function ResolveContent({ cue, textProps }: ResolveContentProps): ReactNode {
  const resolvedName = cue.customName ?? cue.name;

  if (!cue.problem) {
    return <Text fontFamily="mono">{resolvedName}</Text>;
  }

  const oldScore = cue.oldScore;
  const oldRank = cue.oldRank;
  const newTotalScore = cue.newTotalScore;
  const newRank = cue.newRank;
  const newProblemScore = cue.newProblemScore;
  const hasOld =
    oldScore !== undefined &&
    oldRank !== undefined &&
    newTotalScore !== undefined &&
    newRank !== undefined;

  return (
    <Text as="span">
      {resolvedName} |{" "}
      <Text {...textProps} color={verdictColorCode(cue.verdict)}>
        {verdictShortCode(cue.verdict)}
      </Text>{" "}
      |{" "}
      <Text {...textProps} color="fg.success">
        {cue.problem}. {cue.problemDisplayName}
        {newProblemScore !== undefined ? ` (${newProblemScore} PTS)` : ""}
      </Text>
      {hasOld ? (
        <>
          {" "}
          | Total <Text {...textProps}>{oldScore}</Text> to{" "}
          <Text {...textProps} color="fg.success">
            {newTotalScore}
          </Text>{" "}
          | Rank <Text {...textProps}>{oldRank}</Text> to{" "}
          <Text {...textProps} color="fg.success">
            {newRank}
          </Text>
          {oldRank - newRank > 0 ? ` (+${oldRank - newRank})` : ""}
        </>
      ) : null}
    </Text>
  );
}
