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
    return (
      <Text as="span">
        <Text {...textProps} color="fg.muted">
          RES
        </Text>{" "}
        | <ResolveContent cue={cue} textProps={textProps} />
      </Text>
    );
  }

  if (cue.type === TimelineEventType.PRE) {
    const teamName = cue.realName ?? cue.username ?? cue.name;
    return (
      <Text as="span">
        <Text {...textProps} color="fg.muted">
          PRE-RES
        </Text>{" "}
        | <ResolveContent cue={cue} textProps={textProps} nameOverride={teamName} />
      </Text>
    );
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
  nameOverride?: string;
}

function ResolveContent({ cue, textProps, nameOverride }: ResolveContentProps): ReactNode {
  const resolvedName = cue.customName ?? nameOverride ?? cue.name;

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
