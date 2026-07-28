import { Box, Table, Text, useToken } from "@chakra-ui/react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { memo } from "react";

import { problemCellEqual } from "@/lib/leaderboard-comparators";
import { useVerdictColor, verdictShortCode } from "@/lib/verdict";

import { useIsBigScreen } from "./leaderboard-provider";

const MotionBox = motion.create(Box);

interface ProblemCellProps {
  problem: LeaderboardProblemResult;
}

export const ProblemCell = memo(
  ({ problem }: ProblemCellProps) => {
    const isBigScreen = useIsBigScreen().value;
    const isPending = problem.verdict === VerdictRunResult.PENDING;

    const { bg, fg, border } = useVerdictColor(problem.verdict);
    const [bgColor, borderColor] = useToken("colors", [bg, border]);

    return (
      <Table.Cell px={1}>
        {isPending ? (
          <MotionBox
            borderWidth={2}
            bg={bg}
            rounded="sm"
            px={1.5}
            py={0.5}
            textAlign="center"
            initial={{
              borderColor: bgColor,
            }}
            animate={{
              borderColor: [bgColor, borderColor, bgColor],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Text lineHeight="1.3" fontFamily="mono" color={fg}>
              {problem.score}
            </Text>
            <Text fontSize={isBigScreen ? "md" : "xs"} lineHeight="1.2" color={fg}>
              {verdictShortCode(problem.verdict)}
            </Text>
          </MotionBox>
        ) : (
          <Box
            borderWidth={2}
            borderColor={border}
            bg={bg}
            rounded="sm"
            px={1.5}
            py={0.5}
            textAlign="center"
          >
            <Text lineHeight="1.3" fontFamily="mono">
              {problem.score}
            </Text>
            <Text fontSize={isBigScreen ? "md" : "xs"} lineHeight="1.2" color={fg}>
              {verdictShortCode(problem.verdict)}
            </Text>
          </Box>
        )}
      </Table.Cell>
    );
  },
  (prev, next) => problemCellEqual(prev.problem, next.problem),
);
