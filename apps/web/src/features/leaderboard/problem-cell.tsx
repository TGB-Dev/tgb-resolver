import { Box, Table, Text, useToken } from "@chakra-ui/react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { memo } from "react";

import { problemCellEqual } from "@/lib/leaderboard-comparators";
import { useVerdictColor, verdictShortCode } from "@/lib/verdict";

import { TgbResolverEasings } from "../shared/anim/easings";
import { useIsBigScreen } from "./leaderboard-provider";

const MotionBox = motion.create(Box);

interface ProblemCellProps {
  problem: LeaderboardProblemResult;
}

export const ProblemCell = memo(
  ({ problem }: ProblemCellProps) => {
    const isBigScreen = useIsBigScreen().value;
    const isPending = problem.verdict === VerdictRunResult.PENDING;
    const isUnknown = problem.verdict === VerdictRunResult.UNKNOWN;

    const { bg, fg, border } = useVerdictColor(problem.verdict);
    const [bgColor, borderColor] = useToken("colors", [bg, border]);

    const textColor = isUnknown ? fg : undefined;
    const score = isUnknown ? " " : problem.score;

    const pendingMotionProps = isPending
      ? {
          initial: { borderColor: bgColor },
          animate: { borderColor: [bgColor, borderColor, bgColor] },
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: TgbResolverEasings.inOutQuad,
          },
        }
      : { borderColor };

    return (
      <Table.Cell px={1}>
        <MotionBox
          flex={1}
          display="flex"
          flexDir="column"
          justifyContent="center"
          borderWidth={2}
          bg={bg}
          rounded="sm"
          px={1.5}
          py={0.5}
          textAlign="center"
          {...pendingMotionProps}
        >
          <Text lineHeight="1.3" fontFamily="mono" color={textColor} whiteSpaceCollapse="preserve">
            {score}
          </Text>
          <Text
            fontSize={isBigScreen ? "md" : "xs"}
            lineHeight="1.2"
            color={fg}
            whiteSpaceCollapse="preserve"
          >
            {verdictShortCode(problem.verdict)}
          </Text>
        </MotionBox>
      </Table.Cell>
    );
  },
  (prev, next) => problemCellEqual(prev.problem, next.problem),
);
