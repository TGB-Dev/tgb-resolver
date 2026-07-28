import { Box, Table, Text } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { memo, useRef } from "react";

import { entryEqual, problemCellEqual } from "@/lib/leaderboard-comparators";
import {
  verdictBgCode,
  verdictBorderCode,
  verdictColorCode,
  verdictShortCode,
} from "@/lib/verdict";
import { leaderboardModel } from "@/models";

const MotionRow = motion.create(Table.Row);
const MotionBox = motion.create(Box);

const ProblemCell = memo<{ problem: LeaderboardProblemResult }>(
  function ProblemCell({ problem }) {
    const isPending = problem.verdict === VerdictRunResult.PENDING;

    return (
      <Table.Cell px={1}>
        {isPending ? (
          <MotionBox
            borderWidth={1}
            borderColor={verdictBorderCode(problem.verdict)}
            bg={verdictBgCode(problem.verdict)}
            rounded="sm"
            px={1.5}
            py={0.5}
            textAlign="center"
            animate={{
              borderColor: [
                "var(--chakra-colors-cyan-400)",
                "var(--chakra-colors-purple-500)",
                "var(--chakra-colors-cyan-400)",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Text lineHeight="1.3">{problem.score}</Text>
            <Text fontSize="xs" lineHeight="1.2" color={verdictColorCode(problem.verdict)}>
              {verdictShortCode(problem.verdict)}
            </Text>
          </MotionBox>
        ) : (
          <Box
            borderWidth={1}
            borderColor={verdictBorderCode(problem.verdict)}
            bg={verdictBgCode(problem.verdict)}
            rounded="sm"
            px={1.5}
            py={0.5}
            textAlign="center"
          >
            <Text lineHeight="1.3">{problem.score}</Text>
            <Text fontSize="xs" lineHeight="1.2" color={verdictColorCode(problem.verdict)}>
              {verdictShortCode(problem.verdict)}
            </Text>
          </Box>
        )}
      </Table.Cell>
    );
  },
  (prev, next) => problemCellEqual(prev.problem, next.problem),
);

const UsernameCell = memo<{ username: string }>(({ username }) => (
  <Table.Cell>{username}</Table.Cell>
));

const ScoreCell = memo<{ score: number }>(({ score }) => <Table.Cell>{score}</Table.Cell>);

const PenaltyCell = memo<{ penalty: number }>(({ penalty }) => <Table.Cell>{penalty}</Table.Cell>);

interface LeaderboardRowProps {
  data: LeaderboardEntry;
  isCurrentResolved: boolean;
}

const LeaderboardRow = memo<LeaderboardRowProps>(
  function LeaderboardRow({ data, isCurrentResolved }) {
    const username = `${data.realName} (${data.username})`;

    const ref = useRef<HTMLTableRowElement>(null);

    useSignalEffect(() => {
      const targetId = leaderboardModel.currentBottomView.value;
      if (targetId !== data.userId) return;

      leaderboardModel.getSignal(targetId).value;

      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ref.current?.scrollIntoView({ behavior: "auto", block: "end" });
        });
      });
      return () => cancelAnimationFrame(raf);
    });

    return (
      <MotionRow ref={ref} bg={isCurrentResolved ? "rgba(245, 158, 11, 0.12)" : undefined}>
        <Table.Cell>{data.rank}</Table.Cell>

        <UsernameCell username={username} />

        {data.problems.map((problem) => (
          <ProblemCell key={problem.problemId} problem={problem} />
        ))}

        <ScoreCell score={data.totalScore} />
        <PenaltyCell penalty={data.totalPenalty} />
      </MotionRow>
    );
  },
  (prev, next) =>
    entryEqual(prev.data, next.data) && prev.isCurrentResolved === next.isCurrentResolved,
);

export default LeaderboardRow;
