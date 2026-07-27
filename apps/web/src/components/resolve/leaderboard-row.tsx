import { Box, Table, Text } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { memo, useRef } from "react";

import {
  verdictBgCode,
  verdictBorderCode,
  verdictColorCode,
  verdictShortCode,
} from "@/lib/verdict";
import { leaderboardModel } from "@/models";

const MotionRow = motion.create(Table.Row);
const MotionBox = motion.create(Box);

function entryEqual(a: LeaderboardEntry, b: LeaderboardEntry): boolean {
  if (a.rank !== b.rank || a.totalScore !== b.totalScore || a.totalPenalty !== b.totalPenalty)
    return false;
  if (a.problems.length !== b.problems.length) return false;
  return a.problems.every(
    (p, i) => p.score === b.problems[i].score && p.verdict === b.problems[i].verdict,
  );
}

function problemCellEqual(a: LeaderboardProblemResult, b: LeaderboardProblemResult): boolean {
  return a.score === b.score && a.verdict === b.verdict;
}

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

interface LeaderboardRowProps {
  data: LeaderboardEntry;
}

const LeaderboardRow = memo<LeaderboardRowProps>(
  function LeaderboardRow({ data }) {
    const username = `${data.realName} (${data.username})`;
    const isCurrentResolved = data.userId === leaderboardModel.currentResolvedUserId.value;

    const ref = useRef<HTMLTableRowElement>(null);

    useSignalEffect(() => {
      const targetId = leaderboardModel.currentBottomView.value;
      if (targetId !== data.userId) return;

      leaderboardModel.getSignal(targetId).value;

      const raf = requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
      return () => cancelAnimationFrame(raf);
    });

    return (
      <MotionRow
        ref={ref}
        layout="position"
        transition={{
          layout: {
            duration: 0.8,
            ease: "easeInOut",
          },
        }}
        bg={isCurrentResolved ? "rgba(245, 158, 11, 0.12)" : undefined}
      >
        <Table.Cell>{data.rank}</Table.Cell>

        <Table.Cell>{username}</Table.Cell>

        {data.problems.map((problem) => (
          <ProblemCell key={problem.problemId} problem={problem} />
        ))}

        <Table.Cell>{data.totalScore}</Table.Cell>
        <Table.Cell>{data.totalPenalty}</Table.Cell>
      </MotionRow>
    );
  },
  (prev, next) => entryEqual(prev.data, next.data),
);

export default LeaderboardRow;
