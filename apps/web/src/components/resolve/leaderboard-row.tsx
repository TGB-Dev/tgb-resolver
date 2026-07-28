import { Box, Table, Text, useToken } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import { VerdictRunResult } from "@tgb-resolver/contracts";
import type { LeaderboardEntry, LeaderboardProblemResult } from "@tgb-resolver/realtime";
import { motion, type Variants } from "motion/react";
import { memo, useMemo, useRef } from "react";

import { entryEqual, problemCellEqual } from "@/lib/leaderboard-comparators";
import {
  verdictBgCode,
  verdictBorderCode,
  verdictColorCode,
  verdictShortCode,
} from "@/lib/verdict";
import { leaderboardModel } from "@/models";
import { animateScrollIntoView } from "@/utils/scroll";

import { useColorMode } from "../ui/color-mode";

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
    const [normalBg, darkBg, lightBg] = useToken("colors", ["bg", "yellow.700", "yellow.300/90"]);
    const { colorMode } = useColorMode();

    const variants: Variants = useMemo(
      () => ({
        dark: { backgroundColor: normalBg },
        darkCurrent: { backgroundColor: darkBg },
        light: { backgroundColor: normalBg },
        lightCurrent: { backgroundColor: lightBg },
      }),
      [normalBg, darkBg, lightBg],
    );

    const currentVariant = useMemo(() => {
      if (colorMode === "dark") {
        return isCurrentResolved ? "darkCurrent" : "dark";
      } else {
        return isCurrentResolved ? "lightCurrent" : "light";
      }
    }, [colorMode, isCurrentResolved]);

    const ref = useRef<HTMLTableRowElement>(null);

    useSignalEffect(() => {
      const targetId = leaderboardModel.currentBottomView.value;
      if (targetId !== data.userId) return;

      requestAnimationFrame(() => {
        if (!ref.current) return;

        let parent: HTMLElement | null = ref.current.parentElement;
        while (parent) {
          const style = getComputedStyle(parent);
          if (
            style.overflow === "auto" ||
            style.overflow === "scroll" ||
            style.overflowY === "auto" ||
            style.overflowY === "scroll"
          ) {
            animateScrollIntoView(ref.current, parent, {
              block: "end",
              duration: 0.8,
              ease: "easeInOut",
            });
            return;
          }
          parent = parent.parentElement;
        }
      });
    });

    // TODO: adjust the content of each row
    // TODO: adjust column width
    // TODO: adjust timings to be rational to whole event's duration
    // TODO: adjust colors
    const username = `${data.realName} (${data.username})`;

    return (
      <MotionRow
        ref={ref}
        layout="position"
        layoutScroll
        variants={variants}
        animate={currentVariant}
        transition={{
          layout: {
            duration: 0.8,
            ease: "easeOut",
          },
          backgroundColor: {
            duration: 0.15,
            ease: "easeInOut",
          },
        }}
      >
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
