import { Table, Text, VStack } from "@chakra-ui/react";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import { motion } from "motion/react";
import { memo, useMemo } from "react";

import { TgbResolverEasings } from "../shared/anim/easings";
import { animationsModel } from "./animations-model";
import { useIsBigScreen } from "./leaderboard-provider";

const MotionText = motion.create(Text);

interface RankCellProps {
  rank: number;
  isCurrentResolved?: boolean;
}

export const RankCell = memo(({ rank, isCurrentResolved }: RankCellProps) => {
  const isBigScreen = useIsBigScreen().value;
  const skip = animationsModel.skipNumberAnimations.value;

  return (
    <Table.Cell>
      {isCurrentResolved ? (
        <MotionText
          key={rank}
          animate={{
            scale: [1, 2.5, 1],
            x: [0, -24, 0],
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.5,
            ease: TgbResolverEasings.swiftOut,
          }}
          fontFamily="mono"
          fontSize={isBigScreen ? "3xl" : undefined}
          textAlign="end"
        >
          <NumberFlow animated={!skip} value={rank} />
        </MotionText>
      ) : (
        <Text fontFamily="mono" fontSize={isBigScreen ? "3xl" : undefined} textAlign="end">
          <NumberFlow animated={!skip} value={rank} />
        </Text>
      )}
    </Table.Cell>
  );
});

interface UsernameCellProps {
  username: string;
  realName: string;
}

export const UsernameCell = memo(({ realName, username }: UsernameCellProps) => (
  <Table.Cell maxW="30ch">
    <VStack alignItems="start" gap={2}>
      <Text>{realName}</Text>
      <Text fontFamily="mono" fontStyle="italic">
        {username}
      </Text>
    </VStack>
  </Table.Cell>
));

interface ScoreCellProps {
  score: number;
}

export const ScoreCell = memo(({ score }: ScoreCellProps) => {
  const skip = animationsModel.skipNumberAnimations.value;

  return (
    <Table.Cell fontFamily="mono" textAlign="end" fontVariantNumeric="tabular-nums">
      <NumberFlow animated={!skip} value={score} />
    </Table.Cell>
  );
});

interface PenaltyCellProps {
  penalty: number;
}

export const PenaltyCell = memo(({ penalty }: PenaltyCellProps) => {
  const skip = animationsModel.skipNumberAnimations.value;

  return (
    <Table.Cell fontFamily="mono" textAlign="end" fontVariantNumeric="tabular-nums">
      <NumberFlow animated={!skip} value={penalty} />
    </Table.Cell>
  );
});

interface SubmissionTimeCellProps {
  submissionTimeSinceStartSeconds: number;
}

export const SubmissionTimeCell = memo(
  ({ submissionTimeSinceStartSeconds }: SubmissionTimeCellProps) => {
    const skip = animationsModel.skipNumberAnimations.value;
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
      <NumberFlowGroup>
        <Table.Cell
          fontFamily="mono"
          fontWeight="bold"
          fontStyle="italic"
          textAlign="end"
          alignItems="baseline"
          fontVariantNumeric="tabular-nums"
        >
          <NumberFlow
            animated={!skip}
            trend={-1}
            value={hours}
            format={{ minimumIntegerDigits: 1 }}
          />
          <NumberFlow
            animated={!skip}
            prefix=":"
            value={minutes}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
          />
          <NumberFlow
            animated={!skip}
            prefix=":"
            value={seconds}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
          />
        </Table.Cell>
      </NumberFlowGroup>
    );
  },
);
