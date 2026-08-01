import { Text, VStack } from "@chakra-ui/react";
import NumberFlow, { NumberFlowGroup, type NumberFlowProps } from "@number-flow/react";
import { motion } from "motion/react";
import { type CSSProperties, memo, useMemo } from "react";

import { TgbResolverEasings } from "../shared/anim/easings";
import { animationsModel } from "./animations-model";
import { useIsBigScreen } from "./leaderboard-provider";

const MotionText = motion.create(Text);

const MONO_END_STYLE: CSSProperties = {
  fontFamily: "var(--chakra-fonts-mono)",
  textAlign: "end",
  fontVariantNumeric: "tabular-nums",
};

function SkipOnHeavyNumberFlow(props: NumberFlowProps) {
  const skip = animationsModel.skipNumberAnimations.value;
  return <NumberFlow animated={!skip} {...props} />;
}

interface RankCellProps {
  rank: number;
  isCurrentResolved?: boolean;
}

export const RankCell = memo(({ rank, isCurrentResolved }: RankCellProps) => {
  const isBigScreen = useIsBigScreen().value;
  const rankTextProps = {
    fontFamily: "mono",
    fontSize: isBigScreen ? "3xl" : undefined,
    textAlign: "end",
  } satisfies CSSProperties;

  return (
    <td>
      {isCurrentResolved ? (
        <MotionText
          key={rank}
          {...rankTextProps}
          animate={{
            scale: [1, 2.5, 1],
            x: [0, -24, 0],
            y: [0, -12, 0],
          }}
          transition={{
            duration: 0.5,
            ease: TgbResolverEasings.swiftOut,
          }}
        >
          <SkipOnHeavyNumberFlow value={rank} />
        </MotionText>
      ) : (
        <Text {...rankTextProps}>
          <SkipOnHeavyNumberFlow value={rank} />
        </Text>
      )}
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
  <td style={MONO_END_STYLE}>
    <SkipOnHeavyNumberFlow value={score} />
  </td>
));

interface PenaltyCellProps {
  penalty: number;
}

export const PenaltyCell = memo(({ penalty }: PenaltyCellProps) => (
  <td style={MONO_END_STYLE}>
    <SkipOnHeavyNumberFlow value={penalty} />
  </td>
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
      <NumberFlowGroup>
        <td
          style={{
            ...MONO_END_STYLE,
            fontWeight: "bold",
            fontStyle: "italic",
          }}
        >
          <SkipOnHeavyNumberFlow trend={-1} value={hours} format={{ minimumIntegerDigits: 1 }} />
          <SkipOnHeavyNumberFlow
            prefix=":"
            value={minutes}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
          />
          <SkipOnHeavyNumberFlow
            prefix=":"
            value={seconds}
            digits={{ 1: { max: 5 } }}
            format={{ minimumIntegerDigits: 2 }}
          />
        </td>
      </NumberFlowGroup>
    );
  },
);
