import { Box, Table, Text } from "@chakra-ui/react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { motion } from "motion/react";
import { memo } from "react";

import {
  verdictBgCode,
  verdictBorderCode,
  verdictColorCode,
  verdictShortCode,
} from "@/lib/verdict";

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

interface LeaderboardRowProps {
  data: LeaderboardEntry;
}

const LeaderboardRow = memo<LeaderboardRowProps>(
  function LeaderboardRow({ data }) {
    const username = `${data.realName} (${data.username})`;

    return (
      <MotionRow
        layout
        transition={{
          layout: {
            duration: 0.8,
            ease: "easeInOut",
          },
        }}
      >
        <Table.Cell>{data.rank}</Table.Cell>

        <Table.Cell>{username}</Table.Cell>

        {data.problems.map((problem) => (
          <Table.Cell key={problem.problemId} px={1}>
            {problem.verdict === VerdictRunResult.PENDING ? (
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
        ))}

        <Table.Cell>{data.totalScore}</Table.Cell>
        <Table.Cell>{data.totalPenalty}</Table.Cell>
      </MotionRow>
    );
  },
  (prev, next) => entryEqual(prev.data, next.data),
);

export default LeaderboardRow;
