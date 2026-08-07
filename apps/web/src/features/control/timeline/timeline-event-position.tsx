import { Box } from "@chakra-ui/react";
import { useComputed } from "@preact/signals-react";
import { useCallback } from "react";

import { showModel } from "@/features/shared/show-model";
import { Tooltip } from "@/features/shared/ui/tooltip";

export interface TimelineEventPositionProps {
  eventId: number;
  fallbackPosition: number;
  onSeek: (id: number) => void;
}

export function TimelineEventPosition({
  eventId,
  fallbackPosition,
  onSeek,
}: TimelineEventPositionProps) {
  const position = useComputed(() => {
    const index = showModel.showOrderedIds.value.indexOf(eventId);
    return index < 0 ? fallbackPosition : index + 1;
  });

  const handleClick = useCallback(() => {
    onSeek(eventId);
  }, [eventId, onSeek]);

  return (
    <Tooltip
      content={`Seek to event #${position.value}`}
      openDelay={0}
      positioning={{ placement: "left" }}
    >
      <Box textAlign="end" fontFamily="mono" cursor="pointer" onClick={handleClick}>
        {position.value}
      </Box>
    </Tooltip>
  );
}
