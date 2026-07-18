import { Box, useToken } from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useComputed } from "@preact/signals-react";
import { type AnimationPlaybackControls, animate } from "motion/react";
import { useEffect, useRef } from "react";

import { playbackSignal } from "@/models/playback-state";

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
  const eventIsCurrent = useComputed(() => playbackSignal.value.currentEventId === eventId);
  const isCurrent = eventIsCurrent.value;
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

    if (isCurrent) {
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
  }, [isCurrent, durationInSeconds]);

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
        position="absolute"
        inset={0}
        borderWidth={2}
        borderColor={isCurrent ? "border.success" : "transparent"}
        animation={isCurrent ? `${pulseBorder} 1s infinite` : undefined}
        pointerEvents="none"
        zIndex={1}
      />
    </>
  );
}
