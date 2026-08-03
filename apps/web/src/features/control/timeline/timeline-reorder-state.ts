import { signal } from "@preact/signals-react";

export function createTimelineReorderState() {
  const rows = signal<number[] | null>(null);

  return {
    rows,
    set(nextRows: number[]) {
      rows.value = nextRows;
    },
    take() {
      const nextRows = rows.peek();
      rows.value = null;
      return nextRows;
    },
  };
}
