import { Box, IconButton } from "@chakra-ui/react";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Check } from "lucide-react";
import { type MouseEvent, useCallback } from "react";

import { usePatchTimelineEventMutation } from "@/features/control/hooks";
import { Tooltip } from "@/features/shared/ui/tooltip";

export interface ControlTimelineManualInteractionProps {
  payload: TimelineTableItem;
  isNear?: boolean;
}

export function ControlTimelineManualInteraction({
  payload,
  isNear = false,
}: ControlTimelineManualInteractionProps) {
  const patchEvent = usePatchTimelineEventMutation();

  const handleToggle = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      e.stopPropagation();
      void patchEvent.mutateAsync({
        eventId: payload.id,
        requireManualInteraction: !payload.requireManualInteraction,
      });
    },
    [patchEvent.mutateAsync, payload.id, payload.requireManualInteraction],
  );

  if (!isNear) {
    // Keep the toggle column a plain static indicator when not hovered:
    // mounting a Chakra button for every row is wasted work on rapid
    // unmount/remount. Most rows render nothing at all.
    if (!payload.requireManualInteraction) return null;

    return <Check size={14} />;
  }

  return (
    <Tooltip content="Double-click to toggle manual interaction" openDelay={0}>
      <IconButton
        aria-label="Toggle manual interaction"
        variant="ghost"
        minW={0}
        w="full"
        h={6}
        m={1}
        onDoubleClick={handleToggle}
      >
        {payload.requireManualInteraction ? <Check size={14} /> : null}
      </IconButton>
    </Tooltip>
  );
}
