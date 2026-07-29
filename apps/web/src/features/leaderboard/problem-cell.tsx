import { Box, type BoxProps, Table, Text, useToken } from "@chakra-ui/react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { Fragment, memo, useMemo } from "react";

import { problemCellEqual } from "@/lib/leaderboard-comparators";
import { type ChakraColor, useVerdictColor, verdictShortCode } from "@/lib/verdict";

import { TgbResolverEasings } from "../shared/anim/easings";
import { useIsBigScreen } from "./leaderboard-provider";

const MotionBox = motion.create(Box);
type MotionBoxProps = React.ComponentProps<typeof MotionBox>;
type SharedBoxProps = MotionBoxProps & BoxProps;

const SHARED_CELL_PROPS: SharedBoxProps = {
  flex: 1,
  display: "flex",
  flexDir: "column",
  justifyContent: "center",
  borderWidth: 2,
  rounded: "sm",
  px: 1.5,
  py: 0.5,
  textAlign: "center",
};

interface ProblemCellProps {
  problem: LeaderboardProblemResult;
}

export const ProblemCell = memo(
  ({ problem }: ProblemCellProps) => {
    const isPending = useMemo(
      () => problem.verdict === VerdictRunResult.PENDING,
      [problem.verdict],
    );
    const isUnknown = useMemo(
      () => problem.verdict === VerdictRunResult.UNKNOWN,
      [problem.verdict],
    );
    const isUnresolved = useMemo(
      () => problem.verdict === VerdictRunResult.UNRESOLVED,
      [problem.verdict],
    );

    const { bg, fg: verdictFg, border } = useVerdictColor(problem.verdict);
    const [bgColor, borderColor] = useToken("colors", [bg as string, border as string]);

    const scoreFg = useMemo(
      () => (isUnresolved || isPending ? verdictFg : undefined),
      [verdictFg, isUnresolved, isPending],
    );
    const score = useMemo(() => (isUnknown ? " " : problem.score), [isUnknown, problem.score]);

    const motionBoxProps = useMemo(
      () =>
        ({
          initial: {
            borderColor: borderColor,
            backgroundColor: bgColor,
          },
          animate: {
            borderColor: [bgColor, borderColor, bgColor],
          },
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: TgbResolverEasings.inOutQuad,
          },
        }) satisfies MotionBoxProps,
      [bgColor, borderColor],
    );

    const boxProps = useMemo(
      () =>
        ({
          borderColor: border,
          bg,
        }) satisfies BoxProps,
      [bg, border],
    );

    return (
      <Table.Cell px={1}>
        {isPending ? (
          <MotionBox {...SHARED_CELL_PROPS} {...motionBoxProps}>
            <ScoreVerdictCell
              score={score}
              verdict={problem.verdict}
              scoreFg={scoreFg}
              verdictFg={verdictFg}
            />
          </MotionBox>
        ) : (
          <Box {...SHARED_CELL_PROPS} {...boxProps}>
            <ScoreVerdictCell
              score={score}
              verdict={problem.verdict}
              scoreFg={scoreFg}
              verdictFg={verdictFg}
            />
          </Box>
        )}
      </Table.Cell>
    );
  },
  (prev, next) => problemCellEqual(prev.problem, next.problem),
);

interface ScoreVerdictCellProps {
  score: string | number;
  verdict: VerdictRunResult;
  scoreFg: ChakraColor;
  verdictFg: ChakraColor;
}

export const ScoreVerdictCell = memo(
  ({ score, verdict, scoreFg, verdictFg }: ScoreVerdictCellProps) => {
    const isBigScreen = useIsBigScreen().value;

    return (
      <Fragment>
        <Text lineHeight="1.3" fontFamily="mono" color={scoreFg} whiteSpaceCollapse="preserve">
          {score}
        </Text>
        <Text
          fontSize={isBigScreen ? "md" : "xs"}
          lineHeight="1.2"
          color={verdictFg}
          whiteSpaceCollapse="preserve"
        >
          {verdictShortCode(verdict)}
        </Text>
      </Fragment>
    );
  },
);
