import type { TimelineTableItem } from "@tgb-resolver/realtime";
import { useCallback } from "react";

import { usePatchTimelineEventMutation } from "@/features/control/hooks";

import { TimelineCellEditable } from "./timeline-cell-editable";

export interface ControlTimelineNumberEditableProps {
  payload: TimelineTableItem;
  field: "durationSeconds" | "triggerOffsetSeconds";
}

export function ControlTimelineNumberEditable({
  payload,
  field,
}: ControlTimelineNumberEditableProps) {
  const patchEvent = usePatchTimelineEventMutation();
  const current = payload[field];

  const handleBlankCommit = useCallback(() => {
    void patchEvent.mutateAsync({
      eventId: payload.id,
      ...(field === "durationSeconds"
        ? { useDefaultDuration: true }
        : { clearTriggerOffset: true }),
    });
  }, [field, patchEvent.mutateAsync, payload.id]);

  const handleCommit = useCallback(
    (value: string) => {
      const normalizedValue = value.trim();
      const next = Number(normalizedValue);
      if (Number.isFinite(next) && (field !== "durationSeconds" || next >= 0) && next !== current)
        void patchEvent.mutateAsync({ eventId: payload.id, [field]: next });
    },
    [current, field, patchEvent.mutateAsync, payload.id],
  );

  return (
    <TimelineCellEditable
      value={current == null ? "" : String(current)}
      displayValue={
        field === "triggerOffsetSeconds" && current != null && current > 0
          ? `+${current}`
          : (current ?? "")
      }
      onBlankCommit={handleBlankCommit}
      textAlign="end"
      fontFamily="mono"
      onCommit={handleCommit}
    />
  );
}
