import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { memo, useCallback } from "react";

import { useRenameControlEventMutation } from "@/features/control/hooks";

import { TimelineCellEditable } from "./timeline-cell-editable";

export interface ControlTimelineEventCustomNameEditableProps {
  payload: TimelineTableItem;
}

function resolveDisplayName(payload: Pick<TimelineTableItem, "customName" | "placeholderName">) {
  return payload.customName && payload.customName.trim().length > 0
    ? payload.customName
    : payload.placeholderName;
}

export const ControlTimelineEventCustomNameEditable = memo(
  function ControlTimelineEventCustomNameEditable({
    payload,
  }: ControlTimelineEventCustomNameEditableProps) {
    const renameEvent = useRenameControlEventMutation();
    const currentName = payload.customName ?? "";

    const handleCommit = useCallback(
      (value: string) => {
        const customName = value.trim();
        if (customName !== currentName.trim()) {
          void renameEvent.mutateAsync({ eventId: payload.id, type: payload.type, customName });
        }
      },
      [currentName, payload.id, payload.type, renameEvent.mutateAsync],
    );

    return (
      <TimelineCellEditable
        value={currentName}
        displayValue={resolveDisplayName(payload)}
        placeholder={payload.placeholderName}
        textAlign="start"
        onCommit={handleCommit}
      />
    );
  },
);
