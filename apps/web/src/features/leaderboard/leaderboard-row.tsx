import { useToken } from "@chakra-ui/react";
import { useSignalEffect } from "@preact/signals-react";
import type { LeaderboardEntry } from "@tgb-resolver/realtime";
import { motion, type Variants } from "motion/react";
import { memo, useMemo, useRef } from "react";

import { leaderboardModel } from "@/features/leaderboard/leaderboard-model";
import { animateScrollIntoView } from "@/features/leaderboard/utils/scroll";
import { useColorMode } from "@/features/shared/ui/color-mode";
import { entryEqual } from "@/lib/leaderboard-comparators";

import { TgbResolverEasings } from "../shared/anim/easings";
import { PenaltyCell, RankCell, ScoreCell, SubmissionTimeCell, UsernameCell } from "./cells";
import { ProblemCell } from "./problem-cell";

// TODO: adjust animation timings to be relative to whole event's duration
// TODO: submission count to show a contestant's effort on a problem, and we'll show the verdict on those individual attempt also
// TODO: rank number anim
// TODO: update with a pending, pending-active state, as currently it it's turning "unexpectedly" from Unknown to Pending
// on PRE-RES, which is kinda bad on the UX side of things

const MotionRow = motion.create("tr");

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
    const submissionTimeSinceStartSeconds = Math.max(
      ...data.problems.map((p) => p.timeSinceStart),
      data.lastSubmittedSeconds ?? 0,
      0,
    );

    useSignalEffect(() => {
      const targetId = leaderboardModel.currentBottomView.value;
      if (targetId !== data.userId) return;

      const raf = requestAnimationFrame(() => {
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
              ease: TgbResolverEasings.inOutQuad,
            });
            return;
          }
          parent = parent.parentElement;
        }
      });
      // Cancel the pending frame when the cue advances again before it fires;
      // the scroll animation itself is superseded by animateScrollIntoView's
      // module-level active handle.
      return () => cancelAnimationFrame(raf);
    });

    return (
      <MotionRow
        ref={ref}
        style={{
          position: "relative",
          zIndex: isCurrentResolved ? 5 : 0,
        }}
        layout="position"
        layoutScroll
        variants={variants}
        animate={currentVariant}
        transition={{
          layout: {
            duration: 0.8,
            ease: TgbResolverEasings.swiftOut,
          },
          backgroundColor: {
            duration: 0.15,
            ease: TgbResolverEasings.inOutQuad,
          },
        }}
      >
        <RankCell rank={data.rank} isCurrentResolved={isCurrentResolved} />

        <UsernameCell realName={data.realName} username={data.username} />

        {data.problems.map((problem) => (
          <ProblemCell key={problem.problemId} problem={problem} />
        ))}

        <ScoreCell score={data.totalScore} />
        <PenaltyCell penalty={data.totalPenalty} />

        <SubmissionTimeCell submissionTimeSinceStartSeconds={submissionTimeSinceStartSeconds} />
      </MotionRow>
    );
  },
  (prev, next) =>
    entryEqual(prev.data, next.data) && prev.isCurrentResolved === next.isCurrentResolved,
);
