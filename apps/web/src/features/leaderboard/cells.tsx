import { Text, VStack } from "@chakra-ui/react";
import { type CSSProperties, memo, useMemo } from "react";

import { useIsBigScreen } from "./leaderboard-provider";

const MONO_END_STYLE: CSSProperties = {
  fontFamily: "var(--chakra-fonts-mono)",
  textAlign: "end",
  fontVariantNumeric: "tabular-nums",
};

interface RankCellProps {
  rank: number;
  isCurrentResolved?: boolean;
}

export const RankCell = memo(({ rank }: RankCellProps) => {
  const isBigScreen = useIsBigScreen().value;
  const rankTextProps = {
    fontFamily: "mono",
    fontSize: isBigScreen ? "3xl" : undefined,
    textAlign: "end",
  } satisfies CSSProperties;

  return (
    <td>
      <Text {...rankTextProps}>{rank}</Text>
    </td>
  );
});

interface UsernameCellProps {
  username: string;
  realName: string;
}

export const UsernameCell = memo(({ realName, username }: UsernameCellProps) => (
  <td style={{ maxWidth: "30ch" }}>
    <VStack alignItems="start" gap={2}>
      <Text>{realName}</Text>
      <Text fontFamily="mono" fontStyle="italic">
        {username}
      </Text>
    </VStack>
  </td>
));

interface ScoreCellProps {
  score: number;
}

export const ScoreCell = memo(({ score }: ScoreCellProps) => (
  <td style={MONO_END_STYLE}>{score}</td>
));

interface PenaltyCellProps {
  penalty: number;
}

export const PenaltyCell = memo(({ penalty }: PenaltyCellProps) => (
  <td style={MONO_END_STYLE}>{penalty}</td>
));

interface SubmissionTimeCellProps {
  submissionTimeSinceStartSeconds: number;
}

export const SubmissionTimeCell = memo(
  ({ submissionTimeSinceStartSeconds }: SubmissionTimeCellProps) => {
    const { seconds, minutes, hours } = useMemo(() => {
      const totalSeconds = Math.floor(submissionTimeSinceStartSeconds);
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60) % 60;
      const hours = Math.floor(totalSeconds / (60 * 60));

      return {
        seconds,
        minutes,
        hours,
      };
    }, [submissionTimeSinceStartSeconds]);

    return (
      <td
        style={{
          ...MONO_END_STYLE,
          fontWeight: "bold",
          fontStyle: "italic",
        }}
      >
        {hours}:{minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </td>
    );
  },
);
