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

export function CurrentEventIndicator({ eventId, durationInSeconds }: CurrentEventIndicatorProps) {
  const [success, error] = useToken("colors", ["green.600", "red.500"]);
  const barRef = useRef<HTMLDivElement>(null);
  const warnRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationPlaybackControls[]>([]);
  const isCurrent = useComputed(() => playbackModel.currentCueId.value === eventId);
  const { colorMode } = useColorMode();
  const colorModeSignal = useLiveSignal(colorMode);

  // The row container's "current" text color (previously driven by an isCurrent
  // prop that re-rendered the whole row subtree on every playback advance) is
  // applied imperatively to the parent row so only this leaf re-renders. The
  // color mode is tracked as a signal so the gate stays live across theme
  // toggles without re-rendering the row.
  useSignalEffect(() => {
    const rowEl = barRef.current?.closest<HTMLElement>("[data-event-id]");
    if (!rowEl) return;
    const currentInLightMode = isCurrent.value && colorModeSignal.value === "light";
    rowEl.style.color = currentInLightMode ? "var(--chakra-colors-fg-inverted)" : "";
  });

  useEffect(() => {
    const barEl = barRef.current;
    const warnEl = warnRef.current;
    if (!barEl || !warnEl) return;

    animationRef.current.forEach((controls) => {
      controls.stop();
    });
    animationRef.current = [];

    const duration = durationInSeconds ?? 0;

    if (isCurrent.value) {
      animationRef.current = [
        animate(barEl, { scaleX: [0, 1] }, { duration, ease: "linear" }),
        animate(warnEl, { opacity: [0, 0, 1] }, { duration, ease: "linear" }),
      ];
    } else {
      animationRef.current = [
        animate(barEl, { scaleX: 0 }, { duration: 0 }),
        animate(warnEl, { opacity: 0 }, { duration: 0 }),
      ];
    }

    return () => {
      animationRef.current.forEach((controls) => {
        controls.stop();
      });
    };
  }, [isCurrent.value, durationInSeconds]);

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
        pointerEvents="none"
        zIndex={0}
      >
        <Box ref={warnRef} position="absolute" inset={0} backgroundColor={error} opacity={0} />
      </Box>
      <Box
        data-testid="current-event-border"
        position="absolute"
        inset={0}
        borderWidth={2}
        borderColor={isCurrent.value ? "border.success" : "transparent"}
        animation={isCurrent.value ? `${pulseBorder} 1s infinite` : undefined}
        pointerEvents="none"
        zIndex={1}
      />
    </>
  );
}
