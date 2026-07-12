import { Text, type TextProps } from "@chakra-ui/react";
import { TimelineEventType } from "@tgb-resolver/contracts";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import type { ReactNode } from "react";

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
  const newScore = cue.newScore;
  const newRank = cue.newRank;
  const hasOld =
    oldScore !== undefined && oldRank !== undefined && newScore !== undefined && newRank !== undefined;

  return (
    <Text as="span">
      {resolvedName},{" "}
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
