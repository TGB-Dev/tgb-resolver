import { IconButton } from "@chakra-ui/react";
import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { Plus } from "lucide-react";

import { Tooltip } from "@/features/shared/ui/tooltip";

export interface TimelineAddButtonsProps {
  payload: TimelineTableItem;
  onHandleCreate: (before: boolean) => void;
  isNear: boolean;
}

const ADD_BUTTON_HOVER = { bg: "bg.emphasized", color: "fg" };

export function TimelineAddButtons({ payload, onHandleCreate, isNear }: TimelineAddButtonsProps) {
  if (!isNear) return null;

  return (
    <>
      <Tooltip content="Add event before" openDelay={0}>
        <IconButton
          aria-label="Add event before"
          size="2xs"
          variant="subtle"
          className="add-btn-wrapper"
          position="absolute"
          top={0}
          right={0}
          transform="translateY(-100%)"
          borderTopRadius="md"
          borderBottomRadius={0}
          bg={payload.id & 1 ? "bg.subtle" : "bg.muted"}
          _hover={ADD_BUTTON_HOVER}
          zIndex={20}
          onClick={() => onHandleCreate(true)}
        >
          <Plus size={12} />
        </IconButton>
      </Tooltip>

      <Tooltip content="Add event after" openDelay={0}>
        <IconButton
          aria-label="Add event after"
          size="2xs"
          variant="subtle"
          className="add-btn-wrapper"
          position="absolute"
          bottom={0}
          right={0}
          transform="translateY(100%)"
          borderTopRadius={0}
          borderBottomRadius="md"
          bg={payload.id & 1 ? "bg.subtle" : "bg.muted"}
          _hover={ADD_BUTTON_HOVER}
          zIndex={20}
          onClick={() => onHandleCreate(false)}
        >
          <Plus size={12} />
        </IconButton>
      </Tooltip>
    </>
  );
}
