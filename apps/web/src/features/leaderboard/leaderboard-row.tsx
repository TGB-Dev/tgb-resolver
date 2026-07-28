import { Table, useToken } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { motion, type Variants } from "motion/react";
import { memo, useMemo, useRef } from "react";

import { useColorMode } from "@/components/ui/color-mode";
import { entryEqual } from "@/lib/leaderboard-comparators";
import { leaderboardModel } from "@/models";
import { animateScrollIntoView } from "@/utils/scroll";

import { PenaltyCell, ScoreCell, SubmissionTimeCell, UsernameCell } from "./cells";
import { ProblemCell } from "./problem-cell";
import { RankCell } from "./rank-cell";

const MotionRow = motion.create(Table.Row);

interface LeaderboardRowProps {
  data: LeaderboardEntry;
  isCurrentResolved: boolean;
}

export const LeaderboardRow = memo(
  ({ data, isCurrentResolved }: LeaderboardRowProps) => {
    const [normalBg, darkBg, lightBg] = useToken("colors", ["bg", "yellow.700", "yellow.300"]);
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

    return (
      <MotionRow
        ref={ref}
        position="relative"
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
        zIndex={isCurrentResolved ? 5 : 0}
      >
        <RankCell rank={data.rank} />

        <UsernameCell realName={data.realName} username={data.username} />

        {data.problems.map((problem) => (
          <ProblemCell key={problem.problemId} problem={problem} />
        ))}

        <ScoreCell score={data.totalScore} />
        <PenaltyCell penalty={data.totalPenalty} />

        <SubmissionTimeCell
          submissionTimeSinceStartSeconds={Math.max(
            ...data.problems.map((p) => p.timeSinceStart),
            data.lastSubmittedSeconds ?? 0,
            0,
          )}
        />
      </MotionRow>
    );
  },
  (prev, next) =>
    entryEqual(prev.data, next.data) && prev.isCurrentResolved === next.isCurrentResolved,
);
