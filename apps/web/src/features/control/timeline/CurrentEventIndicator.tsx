import { Box, useToken } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useComputed, useSignalEffect } from "@preact/signals-react";
import { useLiveSignal } from "@preact/signals-react/utils";
import { type AnimationPlaybackControls, animate } from "motion/react";
import { useEffect, useRef } from "react";

import { playbackModel } from "@/features/control/playback-model";
import { useColorMode } from "@/features/shared/ui/color-mode";

const pulseBorder = keyframes`
  0%, 100% {
    border-color: var(--chakra-colors-border-success);
  }

  50% {
    border-color: var(--chakra-colors-border);
  }
`;

interface CurrentEventIndicatorProps {
  eventId: number;
  durationInSeconds?: number;
}

// Only the current row mounts the animated indicator subtree (progress bar +
// warning overlay + pulsing border); every other row renders a single inert
// wrapper Box so per-row commit/style/layout cost stays flat. Same
// static-until-needed trick as TimelineCellEditable's preview Box.
export function CurrentEventIndicator({ eventId, durationInSeconds }: CurrentEventIndicatorProps) {
  const isCurrent = useComputed(() => playbackModel.currentCueId.value === eventId);
  const { colorMode } = useColorMode();
  const colorModeSignal = useLiveSignal(colorMode);
  const rootRef = useRef<HTMLDivElement>(null);

  // The row container's "current" text color (previously driven by an isCurrent
  // prop that re-rendered the whole row subtree on every playback advance) is
  // applied imperatively to the parent row so only this leaf re-renders. The
  // color mode is tracked as a signal so the gate stays live across theme
  // toggles without re-rendering the row.
  useSignalEffect(() => {
    const rowEl = rootRef.current?.closest<HTMLElement>("[data-event-id]");
    if (!rowEl) return;
    const currentInLightMode = isCurrent.value && colorModeSignal.value === "light";
    rowEl.style.color = currentInLightMode ? "var(--chakra-colors-fg-inverted)" : "";
  });

  return (
    <Box ref={rootRef} position="absolute" inset={0} pointerEvents="none">
      {isCurrent.value ? (
        <CurrentEventActiveIndicator durationInSeconds={durationInSeconds} />
      ) : null}
    </Box>
  );
}

function CurrentEventActiveIndicator({ durationInSeconds }: { durationInSeconds?: number }) {
  const [success, error] = useToken("colors", ["green.600", "red.500"]);
  const barRef = useRef<HTMLDivElement>(null);
  const warnRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationPlaybackControls[]>([]);

  useEffect(() => {
    const barEl = barRef.current;
    const warnEl = warnRef.current;
    if (!barEl || !warnEl) return;

    animationRef.current.forEach((controls) => {
      controls.stop();
    });
    animationRef.current = [];

    const duration = durationInSeconds ?? 0;

    animationRef.current = [
      animate(barEl, { scaleX: [0, 1] }, { duration, ease: "linear" }),
      animate(warnEl, { opacity: [0, 0, 1] }, { duration, ease: "linear" }),
    ];

    return () => {
      animationRef.current.forEach((controls) => {
        controls.stop();
      });
    };
  }, [durationInSeconds]);

  return (
    <>
      <Box
        ref={barRef}
        position="absolute"
        top={0}
        left={0}
        h="full"
        w="full"
        transform="scaleX(0)"
        transformOrigin="left"
        backgroundColor={success}
        zIndex={0}
      >
        <Box ref={warnRef} position="absolute" inset={0} backgroundColor={error} opacity={0} />
      </Box>
      <Box
        data-testid="current-event-border"
        position="absolute"
        inset={0}
        borderWidth={2}
        borderColor="border.success"
        animation={`${pulseBorder} 1s infinite`}
        zIndex={1}
      />
    </>
  );
}
