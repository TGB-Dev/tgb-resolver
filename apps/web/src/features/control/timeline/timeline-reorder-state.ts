import { signal } from "@preact/signals-react";
import type { TimelineTableItem } from "@tgb-resolver/realtime";

export function createTimelineReorderState() {
  const rows = signal<TimelineTableItem[] | null>(null);

  return {
    rows,
    set(nextRows: TimelineTableItem[]) {
      rows.value = nextRows;
    },
    take() {
      const nextRows = rows.peek();
      rows.value = null;
      return nextRows;
    },
  };
}
